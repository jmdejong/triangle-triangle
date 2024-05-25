	"use strict";


const TRIHEIGHT = 0.866;

class NodeId {
	constructor(level, u, v) {
		this.level = level;
		this.u = u;
		this.v = v;
		this.total = 2**level;
		this.w = this.total - u - v;
// 		if (this.w < 0) {
// 			throw new Error("node id out of bounds");
// 		}
	}
	
	toString() {
		return `${this.level},${this.u},${this.v}`;
	}
	static fromString(str) {
		let [level, u, v] = str.split(",").map(i => i|0);
		return new NodeId(level, u, v);
	}
	isNormalized() {
		return ((this.u | this.v) & 1) || this.level <= 1;
	}
	normalize() {
		let u = this.u;
		let v = this.v;
		let level = this.level;
		while (level > 0 && !((u | v) & 1)) {
			u >>= 1;
			v >>= 1;
			--level;
		}
		return new NodeId(level, u, v);
	}
	isRoot() {
		return this.level <= 0;
	}
	parents() {
		if (this.isRoot()) {
			return [];
		} else if (!this.isNormalized()) {
			return [this.normalize()];
		} else {
			return [
				new NodeId(this.level-1, this.u+1>>1, this.v>>1).normalize(),
				new NodeId(this.level-1, this.u>>1, this.v+1>>1).normalize()
			];
		}
	}
	uncles() {
		let unc = []
		if ((this.u & 1) === 0) {
			unc = [
				new NodeId(this.level-1, this.u+2 >> 1, this.v-1 >> 1).normalize(),
				new NodeId(this.level-1, this.u-2 >> 1, this.v+1 >> 1).normalize()
			];
		} else if ((this.v & 1) === 0) {
			unc = [
				new NodeId(this.level-1, this.u+1 >> 1, this.v-2 >> 1).normalize(),
				new NodeId(this.level-1, this.u-1 >> 1, this.v+2 >> 1).normalize()
			];
		} else {
			unc = [
				new NodeId(this.level-1, this.u+1 >> 1, this.v+1 >> 1).normalize(),
				new NodeId(this.level-1, this.u-1 >> 1, this.v-1 >> 1).normalize()
			];
		}
		return unc.filter(n => n.isValid());
	}
	static forLevel(level) {
		let nodes = [];
		let total = 2**level;
		for (let u=0; u<=total; ++u) {
			for (let v=0; u+v<=total; ++v) {
				nodes.push(new NodeId(level, u, v));
			}
		}
		return nodes;
	}
	static forLevelOwn(level) {
		return NodeId.forLevel(level).filter(n => n.isNormalized());
	}
	pos(scale) {
		return new Vec2(this.u + this.v/2, this.v * TRIHEIGHT).mult(scale/this.total);
	}
	equals(other) {
		return this.level === other.level && this.u === other.u && this.v === other.v;
	}
	isValid() {
		return this.u >= 0 && this.v >= 0 && this.w >=0;
	}
}

class Node {
	constructor(id, height) {
		this.id = id;
		this.height = height;
	}
}

class NodeGraph {
	constructor() {
		this.nodes = new Map();
	}
	get(nodeId) {
		return this.nodes.get(nodeId.toString());
	}
	put(node) {
		this.nodes.set(node.id.toString(), node);
	}
}

function readSettings(form) {
	function n(input) {
		if (input.classList.contains("colorscale")) {
			return ColorScale.fromInput(input, input.parentElement.getElementsByTagName("canvas")[0]);
		} else if (input.type === "number") {
			return +(input.value || input.defaultValue);
		} else if (input.type === "checkbox") {
			return input.checked;
		} else if (input.type === "select-one") {
			return input.value;
		} else if (input.type === "text") {
			return input.value;
		} else {
			console.error(`unknown input type '${input.type}'`, input);
		}
	}
	let settings = {};
	for (let input of form.elements) {
		if (input.name) {
			settings[input.name] = n(input);
		}
	}
	if (!settings.seed) {
		settings.seed = 0x91a478e;
	}
	return settings;
}

// for (let node of NodeId.forLevelOwn(2)) {
// 	console.log(node, node.uncles());
// }

function main() {
	for (let colorInput of document.getElementsByClassName("colorscale")) {
		let preview = colorInput.parentElement.getElementsByClassName("colorpreview")[0];
		colorInput.addEventListener("input", e => ColorScale.fromInput(e.target, preview));
		ColorScale.fromInput(colorInput, preview);
	}
	let settings = readSettings(document.getElementById("settings"));
	console.log(settings);
	let nodes = new NodeGraph();
	let size = 700;
	let seed = 580;
	let uncleWeight = 0.3;
	let parentWeight = 1;
	let randomWeight = 4;
	let display = new Display(document.getElementById("view"));
	display.resize(new Vec2(size + 40, size));
	let colors = ["black", "purple", "blue", "cyan", "lime", "yellow", "orange", "pink"];
	for (let level=0; level < 9; ++level) {
		let color = colors[level];
		for (let point of NodeId.forLevelOwn(level)) {
			let h = 0;
			if (point.isRoot()) {
				h = randfNode(point, seed);
			} else {
				let [p1, p2] = point.parents();
				h = (nodes.get(p1).height + nodes.get(p2).height)/2 * parentWeight;
				let [u1, u2] = point.uncles();
				if (u2) {
					h = h * (1-uncleWeight) + (nodes.get(u1).height + nodes.get(u2).height)/2 * uncleWeight;
				}
				h += (randfNode(point, seed)*2 -1) / point.total * randomWeight;
			}
			nodes.put(new Node(point, h));
// 			console.log(c);
			let c = (h ) / 3;
// 			let c = clamp(h*127, 0, 256)|0;
			display.circle(point.pos(size), 2, settings.colorScale.name(c));
		}
	}
}

window.addEventListener("load", main);
