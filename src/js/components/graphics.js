(function () {

	var scene;
	
	window.gfx = (function() {
		
		return {

			createVector: function(pt1, pt2) {
				return new BABYLON.Vector3(pt2.x - pt1.x, pt2.y - pt1.y, pt2.z - pt1.z);
			},
			
			addVectors(vector1, vector2, vector3) {
				vector3 = vector3 || new BABYLON.Vector3(0, 0, 0);
				return new BABYLON.Vector3(vector1.x + vector2.x + vector3.x, vector1.y + vector2.y + vector3.y, vector1.z + vector2.z + vector3.z);	
			},
			
			createLine: function(origin, vector, color, opacity) {
				opacity = opacity || 1;
				color = color || new BABYLON.Color3(1, 1, 1);
				color = BABYLON.Color4.FromColor3(color);
				color.a = opacity;
				return BABYLON.MeshBuilder.CreateLines('lines', {
					points: [origin, gfx.movePoint(origin, vector)],
					colors: [color, color]
				}, scene);
			},
			
			getMidpoint: function(pt1, pt2) {
			
				let midpoint = new BABYLON.Vector3();
				midpoint.x = (pt1.x + pt2.x) / 2;
				midpoint.y = (pt1.y + pt2.y) / 2;
				midpoint.z = (pt1.z + pt2.z) / 2;
				return midpoint;
			},
			
			createLineFromPoints: function(pt1, pt2, color, opacity) {
				
				color = color || new BABYLON.Color3(1, 1, 1);
				color = BABYLON.Color4.FromColor3(color);
				return BABYLON.MeshBuilder.CreateLines('lines', {
					points: [pt1, pt2],
					colors: [color, color],
					isPickable: false
				}, scene);
			},
			
			movePoint: function(pt, vec) {
				return new BABYLON.Vector3(pt.x + vec.x, pt.y + vec.y, pt.z + vec.z);
			},
		}
	})();
	
	module.exports = window.gfx;
})();