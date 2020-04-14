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
			
			createLine: function(origin, vector, color) {
			
				color = color || new BABYLON.Color3(1, 1, 1);
				color = BABYLON.Color4.FromColor3(color);
				return BABYLON.MeshBuilder.CreateLines('lines', {
					points: [origin, gfx.movePoint(origin, vector)],
					colors: [color, color]
				}, scene);
			},
			
			createLineFromPoints: function(pt1, pt2, color) {
			
				color = color || new BABYLON.Color3(1, 1, 1);
				color = BABYLON.Color4.FromColor3(color);
				return BABYLON.MeshBuilder.CreateLines('lines', {
					points: [pt1, pt2],
					colors: [color, color]
				}, scene);
			},
			
			createLineArt: function(pt1, pt2, color) {
				let line = gfx.createLineFromPoints(pt1, pt2, color);
				line.userAdded = true;
				line.draggable = true;
				return line;
			},
			
			createBlock: function(webVRController, color, cursor) {
				
				var box = BABYLON.MeshBuilder.CreateBox('userCreatedBox', {size: cursor.size}, scene);
				box.userAdded = true;
				box.draggable = true;
				box.position = cursor.position;
				box.material = new BABYLON.StandardMaterial('boxMat', scene);
				box.material.emissiveColor = color.clone();
				box.material.alpha = .7;
				return box;
			},
			
			createSphere: function(webVRController, color, cursor) {
				
				var bubble = BABYLON.MeshBuilder.CreateSphere('userCreatedBubble', {diameter: cursor.size}, scene);
				bubble.userAdded = true;
				bubble.draggable = true;
				bubble.position = cursor.position;
				bubble.material = new BABYLON.StandardMaterial('bubbleMat', scene);
				bubble.material.emissiveColor = color.clone();
				bubble.material.alpha = .7;
				return bubble;
			},
			
			getMagnitude: function(vector) {
				let magnitude = Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2) + Math.pow(vector.z, 2));
				return magnitude;
			},

			getMidpoint: function(pt1, pt2) {
			
				let midpoint = new BABYLON.Vector3();
				midpoint.x = (pt1.x + pt2.x) / 2;
				midpoint.y = (pt1.y + pt2.y) / 2;
				midpoint.z = (pt1.z + pt2.z) / 2;
				return midpoint;
			},

			getDistance: function(pt1, pt2) {
			
				let squirt = Math.pow((pt2.x - pt1.x), 2) + Math.pow((pt2.y - pt1.y), 2) + Math.pow((pt2.z - pt1.z), 2);
				return Math.sqrt(squirt);
			},
			
			movePoint: function(pt, vec) {
				return new BABYLON.Vector3(pt.x + vec.x, pt.y + vec.y, pt.z + vec.z);
			},

			getAngleBetweenVectors: function(vector1, vector2) { // convert to BABYLON

				let dot = vector1.dot(vector2);
				let length1 = vector1.length();
				let length2 = vector2.length();			
				return Math.acos(dot / (length1 * length2));
			},
			
			calculateAngle(endpoint1, vertex, endpoint2) { // convert to BABYLON

				let vector1 = new THREE.Vector3(endpoint1.x - vertex.x, endpoint1.y - vertex.y, endpoint1.z - vertex.z);
				let vector2 = new THREE.Vector3(endpoint2.x - vertex.x, endpoint2.y - vertex.y, endpoint2.z - vertex.z);
				return vector1.angleTo(vector2);
			}

			
		}
	})();
	
	module.exports = window.gfx;
})();