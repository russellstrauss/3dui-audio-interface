module.exports = function() {
	
	var canvas, engine, scene, camera, vrHelper;
	var menuItems = [], activeTool, dragTool, eraseTool, saveTool, resetTool;
	var frameCount = 0;
	var leftController, rightController, selectedMesh, draggedMesh;
	var red = new BABYLON.Color3(1, 0, 0), green = new BABYLON.Color3(0, 1, 0), green = new BABYLON.Color3(0, 1, 0), white = new BABYLON.Color3(1, 1, 1), black = new BABYLON.Color3(0, 0, 0);
	
	class MenuItemBlock {

		constructor(pt, title) {
			
			let self = this;
			
			this.position = pt;
			this.active = false;
			this.title = title;
			this.boxSize = .5;
			this.box = BABYLON.MeshBuilder.CreateBox('MenuItemBlock', {size: this.boxSize}, scene)
			this.box.position = new BABYLON.Vector3(pt.x, pt.y + this.boxSize/2, pt.z);
			this.box.material = new BABYLON.StandardMaterial('menuItemMaterial', scene);
			this.box.isMenu = true;
			menuItems.push(this);
			
			this.plane = BABYLON.MeshBuilder.CreatePlane('plane', {height: 1, width: 1}, scene);
			
			this.plane.position = gfx.movePoint(pt, new BABYLON.Vector3(0, this.boxSize + .4, 0));
			this.line = gfx.createLine(gfx.movePoint(pt, new BABYLON.Vector3(0, this.boxSize + .1, 0)), new BABYLON.Vector3(0, .15, 0), white);
			
			let advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.plane);
			let label = new BABYLON.GUI.TextBlock();
			label.text = title;
			label.color = 'white';
			label.fontSize = 200;
			advancedTexture.addControl(label);
			
			this.plane.lookAt(new BABYLON.Vector3(0, 0, 0));
			this.plane.addRotation(0, Math.PI, 0)
						
			this.box.getParent = function() {
				return self;
			}
		}
		
		setActive() {
			
			menuItems.forEach(function(menuItem) {
				menuItem.setInactive();
			});
			
			this.box.material.emissiveColor = new BABYLON.Color3(.03, .56, .95);
			this.active = true;
			activeTool = this;
		}
		
		setInactive() {
			this.box.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
			this.active = false;
		}
	}
	
	return {
		
		init: function() {
			
			let self = this;
			canvas = document.getElementById('renderCanvas');

			var createDefaultEngine = function () {
				return new BABYLON.Engine(canvas, true, {
					preserveDrawingBuffer: true,
					stencil: true
				});
			};
			
			engine = createDefaultEngine();
			scene = self.createScene();
			
			engine.runRenderLoop(function () {
				if (scene) {
					scene.render();
				}
			});

			window.addEventListener('resize', function () {
				engine.resize();
			});
		},
		
		createScene: function() {
			
			let self = this;
			
			scene = new BABYLON.Scene(engine);
			camera = new BABYLON.ArcRotateCamera('Camera', -Math.PI / 2, Math.PI / 2, 12, BABYLON.Vector3.Zero(), scene);
			camera.speed = 1;
			camera.position = new BABYLON.Vector3(0, 1.2, -1.1);
			camera.attachControl(canvas, true);
			
			self.addButtonEvents();
			self.setLighting();
			self.addMenu();
			self.addDesk();
			self.showAudioSamples('./src/audio/greenfields.mp3');
			
			scene.clearColor = new BABYLON.Color3(0, 0, 0);
			return scene;
		},
		
		everyFrame: function() {
			
			frameCount++;
		},
		
		addDesk: function() {
			
			var speaker = new BABYLON.TransformNode();
			let speaker2 = new BABYLON.TransformNode();
			BABYLON.SceneLoader.ImportMesh('', './src/obj/', 'speaker.obj', scene, function(meshChildren) {
				
				for (let i = 0; i < meshChildren.length; i++) {
					meshChildren[i].parent = speaker;
				}
				speaker.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.WORLD);
				speaker.position.x = -.4;
				
				speaker.clone('right_speaker', speaker2, false);
				speaker2.position.x = .4;

				var light = new BABYLON.DirectionalLight('DirectionalLight', new BABYLON.Vector3(0, 0, 1), scene);
				
			});
			
			
			var turntable = new BABYLON.TransformNode();
			var turntable2 = new BABYLON.TransformNode();
			BABYLON.SceneLoader.ImportMesh('', './src/obj/', 'basic-turntable.glb', scene, function(meshChildren) {

				for (let i = 0; i < meshChildren.length; i++) {
					meshChildren[i].parent = turntable;
				}
				turntable.position.x = -.4, turntable.position.y = .6, turntable.position.z = 0;
				turntable.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.WORLD);
				turntable.scaling = new BABYLON.Vector3(.8, .8, .8);
				turntable.clone('right_turntable', turntable2, false);
				turntable2.position.x = .4, turntable.position.y = .6, turntable.position.z = 0;
			});
		},
		
		addMeshSelectionEvents: function() {
			
			let self = this;
			
			vrHelper.onControllerMeshLoaded.add(function(webVRController) {
				
				if (webVRController.hand === 'left') leftController = webVRController;
				if (webVRController.hand === 'right') rightController = webVRController;
				
				webVRController.onTriggerStateChangedObservable.add(function(stateObject) {
					
					if (webVRController.hand === 'right' && selectedMesh != null && stateObject.value >= 1) { // grab
						
						if (typeof selectedMesh.getParent === 'function') {
							selectedMesh.getParent().setActive();
						}
					}
				});
			});
			
			vrHelper.onNewMeshSelected.add(function(mesh) {
				selectedMesh = mesh;
			});
		
			vrHelper.onSelectedMeshUnselected.add(function() {
				selectedMesh = null;
			});
		},
		
		addDragging: function() {
			
			vrHelper.onNewMeshSelected.add(function(mesh) {
				draggedMesh = mesh;
			});
		
			vrHelper.onSelectedMeshUnselected.add(function() {
				draggedMesh = null;
			});
		},
		
		addMenu: function() {
			
			let self = this;
			var light = new BABYLON.PointLight('light', new BABYLON.Vector3(0, 2, 0), scene);
			light.intensity = .2;
			
			var boxSize = .5;
			
			dragTool = new MenuItemBlock(new BABYLON.Vector3(8, 0, 8), 'Drag');
			saveTool = new MenuItemBlock(new BABYLON.Vector3(8, 0, -8), 'Save');
			eraseTool = new MenuItemBlock(new BABYLON.Vector3(-8, 0, -8), 'Erase');
			resetTool = new MenuItemBlock(new BABYLON.Vector3(0, 0, -8), 'Reset');
		},
		
		addButtonEvents: function() {
			
			let self = this;

			vrHelper = scene.createDefaultVRExperience();
			vrHelper.enableInteractions();
			
			self.addMeshSelectionEvents();
			self.addDragging();

			const leftHand = BABYLON.Mesh.CreateBox('leftHand', 0.1, scene);
			leftHand.scaling.z = 2;
			leftHand.isVisible = false;

			const rightHand = BABYLON.Mesh.CreateBox('rightHand', 0.1, scene);
			rightHand.scaling.z = 2;
			rightHand.isVisible = false;
			// vrHelper.enableTeleportation({
			// 	floorMeshName: 'ground'
			// });
			// vrHelper.teleportationTarget = BABYLON.Mesh.CreateSphere('ground', 4, 0.05, scene);
			
			vrHelper.onNewMeshPicked.add(pickingInfo => {
				//console.log(pickingInfo); //Callback receiving ray cast picking info
			});

			vrHelper.onControllerMeshLoaded.add(function(webVRController) {
				
				webVRController.onSecondaryButtonStateChangedObservable.add(function(stateObject) {
					
					if (webVRController.hand === 'left') {
						
						if (stateObject.pressed === true) {	
							self.buttonLeftY(webVRController);
						}
					}
					else {
						if (stateObject.pressed === true) {
							self.buttonRightB(webVRController, stateObject);
						}
						
						if (activeTool === dragTool && draggedMesh !== null && draggedMesh.draggable === true) { // dragging
							if (stateObject.pressed === true) { // grab
								webVRController.mesh.addChild(draggedMesh);
							}
							else { // ungrab 
								webVRController.mesh.removeChild(draggedMesh);
							}
						}
					}
				});
				
				webVRController.onMainButtonStateChangedObservable.add(function(stateObject) {
					
					if (webVRController.hand === 'left' && stateObject.pressed === true) {
						
						self.buttonLeftX(webVRController);
					}
					else if (webVRController.hand === 'right' && stateObject.pressed === true) {
						
						self.buttonRightA(webVRController);
					}
				});

				webVRController.onTriggerStateChangedObservable.add(function(stateObject) {

					if (webVRController.hand === 'left' && stateObject.value >= 1) {
						
						self.buttonLeftBackTrigger(webVRController);
					}
					else if (webVRController.hand === 'right' && stateObject.value >= 1) {
						
						self.buttonRightBackTrigger(webVRController);
					}
				});

				webVRController.onSecondaryTriggerStateChangedObservable.add(function(stateObject) {

					if (webVRController.hand === 'left' && stateObject.value >= 1) {

						self.buttonLeftSideTrigger(webVRController, stateObject);
					}
					else if (webVRController.hand === 'right' && stateObject.value >= 1) {
						
						self.buttonRightSideTrigger(webVRController, stateObject);
					}
				});

				webVRController.onPadValuesChangedObservable.add(function(stateObject) {
					
					if (webVRController.hand === 'left') {
						self.joystickLeft(webVRController, stateObject);
					}
					else if (webVRController.hand === 'right') {
						self.joystickRight(webVRController, stateObject);
					}
				});
			});
		},
		
		addColorpicker: function() {
			
			let colorpickerSize = 6;
			var colorpickerPlane = BABYLON.Mesh.CreatePlane('colorpickerPlane', colorpickerSize, scene);
			colorpickerPlane.material = new BABYLON.StandardMaterial('wallMat', scene);
			colorpickerPlane.position = new BABYLON.Vector3(0, colorpickerSize/2 + 1, 9);
			
			var colorpickerTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(colorpickerPlane, 1024, 1024);
			
			var panel = new BABYLON.GUI.StackPanel();
			panel.width = '1024px';
			panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
			panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
			colorpickerTexture.addControl(panel);

			var picker = new BABYLON.GUI.ColorPicker();
			picker.height = '1000px';
			picker.width = '1000px';
			picker.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
			picker.onValueChangedObservable.add(function(color) {
				activeColor = color;
				vrHelper.setLaserColor(activeColor);
				vrHelper.setLaserLightingState(false);
			});

			panel.addControl(picker); 
		},
		
		buttonLeftY: function(webVRController) {},
		buttonLeftX: function(webVRController) {},
		buttonRightA: function(webVRController) {},
		buttonRightB: function(webVRController) {
			
		},
		buttonLeftBackTrigger: function(webVRController) {},
		buttonRightBackTrigger: function(webVRController, stateObject) {},
		buttonLeftSideTrigger: function(webVRController) {},
		buttonRightSideTrigger: function(webVRController, stateObject) {},
		joystickLeft: function(webVRController, stateObject) {},
		joystickRight: function(webVRController, stateObject) {},
		
		setLighting: function() {
			
			// var directionalLight = new BABYLON.DirectionalLight('DirectionalLight', new BABYLON.Vector3(0, -1, 0), scene);
			// directionalLight.diffuse = new BABYLON.Color3(.4, .4, .4);
			// directionalLight.specular = new BABYLON.Color3(0, 0, .1);
			
			var spotLight = new BABYLON.SpotLight('spotLight', new BABYLON.Vector3(0, 2, 0), new BABYLON.Vector3(0, -1, 0), Math.PI / 3, 2, scene);
			spotLight.diffuse = new BABYLON.Color3(1, 1, 1);
			spotLight.specular = new BABYLON.Color3(1, 1, 1);

			var ground = BABYLON.MeshBuilder.CreateGround('ground', { height: 20, width: 20, subdivisions: 4, isPickable: false }, scene);
		},
		
		showBabylonDebugger: function() {
			
			scene.debugLayer.show({
			    overlay: true
			});
		},
		
		showAudioSamples: function(url) {
			
			let self = this;
			window.AudioContext = window.AudioContext || window.webkitAudioContext;
			let audioContext = new AudioContext();
			fetch(url).then(function(response){
				return response.arrayBuffer();
			})
			.then(function(arrayBuffer) {
				return audioContext.decodeAudioData(arrayBuffer);
			})
			.then(function(audioBuffer) {
				let audioStreamSamples = self.getAudioSamples(audioBuffer);
				
				var samples = [];
				var waveformLength = 3;
				var reds2 = [];
				for (var i = 0; i < 1000; i++) {
					let x = -(waveformLength/2) + ((waveformLength/1000) * i); // the dividing by 2 centers in view, then divide into 1000 chunks to get desired length
					let y = audioStreamSamples[i] + 1;
					let z = 3;
					reds2.push(new BABYLON.Color4(1,1,1,1));
					samples.push(new BABYLON.Vector3(x, y, z));
				}
				var audioCurve = new BABYLON.Curve3(samples);

				var points = audioCurve.getPoints();
				var path3d = new BABYLON.Path3D(points);
				var curve = path3d.getCurve();
				var line = BABYLON.Mesh.CreateLines('curve', curve, scene);
				
				//var line2 = BABYLON.Mesh.CreateLines('curve', curve, scene);
				
			});
		},
		
		getAudioSamples: function(audioBuffer) {
			const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
			const samples = 1000; // Number of samples we want to have in our final data set
			const blockSize = Math.floor(rawData.length / samples); // the number of samples in each subdivision
			const filteredData = [];
			for (let i = 0; i < samples; i++) {
				let blockStart = blockSize * i; // the location of the first sample in the block
				let sum = 0;
				for (let j = 0; j < blockSize; j++) {
					sum = sum + Math.abs(rawData[blockStart + j]); // find the sum of all the samples in the block
				}
				filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
			}
			return filteredData;
		}
	}
}