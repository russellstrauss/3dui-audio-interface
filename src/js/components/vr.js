module.exports = function() {
	
	var canvas, engine, scene, camera, vrHelper;
	var menuItems = [], activeTool, lineTool, blockTool, dragTool, bubbleTool, eraseTool, saveTool, resetTool, uiSwitcher;
	var frameCount = 0;
	var userAddedObjects = [], cursor, cursorMaterial, cursorAlpha = .25, leftController, rightController, floorUI, uiMode = '3D';
	var activeColor = new BABYLON.Color3(1, 1, 1), selectedMesh, draggedMesh;
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
			
			if (activeTool === uiSwitcher && uiMode === '3D') {
				this.hideAllMenuItems();
				floorUI.material.alpha = 1;
				uiMode = '2D';
			}
			else if (activeTool === uiSwitcher && uiMode === '2D') {
				
				this.showAllMenuItems();
				floorUI.material.alpha = 0;
				uiMode = '3D';
			}
		}
		
		setInactive() {
			this.box.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
			this.active = false;
		}
		
		hideAllMenuItems() {
			
			menuItems.forEach(function(menuItem) {
				if (menuItem !== uiSwitcher) {
					menuItem.box.material.alpha = 0;
					menuItem.plane.material.alpha = 0;
					menuItem.line.dispose();
				}
			});
		}
		
		showAllMenuItems() {
			
			menuItems.forEach(function(menuItem) {
				if (menuItem !== uiSwitcher) {
					menuItem.box.material.alpha = 1;
					menuItem.plane.material.alpha = 1;
					menuItem.line = gfx.createLine(gfx.movePoint(menuItem.position, new BABYLON.Vector3(0, menuItem.boxSize + .1, 0)), new BABYLON.Vector3(0, .15, 0), white);
				}
			});
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
					self.everyFrame();
				}
			});

			window.addEventListener('resize', function () {
				engine.resize();
			});
		},
		
		createScene: function() {
			
			let self = this;
			
			scene = new BABYLON.Scene(engine);
			camera = new BABYLON.WebVRFreeCamera("WVR", BABYLON.Vector3.Zero(), scene);
			camera.position = new BABYLON.Vector3(0, 1.2, -1.1);
			camera.attachControl(canvas, true);
			
			self.addButtonEvents();
			self.setLighting();
			self.addMenu();
			self.addColorpicker();
			self.addToolObjects();
			
			scene.clearColor = new BABYLON.Color3(0, 0, 0);
			return scene;
		},
		
		everyFrame: function() {
			
			if (rightController) {
				cursor.direction = rightController.getForwardRay(1).direction;
				cursor.position = rightController.devicePosition.add(rightController.getForwardRay(1).direction.scale(cursor.length));
			}
			
			// if (frameCount % 100 === 0) {
			// 	//console.log();
			// }
			frameCount++;
		},
		
		addToolObjects: function() {
			
			let self = this;
			cursorMaterial = new BABYLON.StandardMaterial("cursorMaterial", scene);
			//cursorMaterial.alpha = 0;
			cursorMaterial.emissiveColor = activeColor;
			cursor = BABYLON.MeshBuilder.CreateBox('cursor', { size: .05}, scene);
			cursor.size = .05;
			cursor.length = 1;
			cursor.isPickable = false;
			cursor.position = new BABYLON.Vector3(0, .75, .75);
			cursor.material = cursorMaterial;
			self.updateCursor(activeTool);
		},
		
		eraseObjects: function() {

			userAddedObjects.forEach(function(mesh) {
				mesh.dispose();
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
							self.updateCursor(activeTool);
						}
						if (activeTool === resetTool) self.eraseObjects();
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
		
		updateCursor: function(tool) {
			
			let length = cursor.length;
			let size = cursor.size;
			
			if (tool === blockTool) {
				cursor.dispose();
				cursor = BABYLON.MeshBuilder.CreateBox('cursor', { size: size}, scene);
				cursor.size = size;
				cursor.length = length;
				cursor.isPickable = false;
				cursor.material = cursorMaterial;
				cursorMaterial.alpha = cursorAlpha;
			}
			else if (tool == bubbleTool) {
				cursor.dispose();
				cursor = BABYLON.MeshBuilder.CreateSphere('userCreatedBubble', {diameter: size}, scene);
				cursor.size = size;
				cursor.length = length;
				cursor.isPickable = false;
				cursor.material = cursorMaterial;
				cursorMaterial.alpha = cursorAlpha;
			}
			else if (tool === dragTool) {
				cursorMaterial.alpha = 0;
			}
			else if (tool === lineTool) {
				cursor.dispose();
				cursor = BABYLON.MeshBuilder.CreateBox('cursor', { size: .05}, scene);
				cursor.color = new BABYLON.Color3(1, 0, 0);
				cursor.size = size;
				cursor.length = length;
				cursor.isPickable = false;
				cursor.material = cursorMaterial;
				cursorMaterial.alpha = cursorAlpha;
			}
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
			var light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 5, 0), scene);
			light.intensity = .2;
			
			var boxSize = .5;
			
			lineTool = new MenuItemBlock(new BABYLON.Vector3(-8, 0, 8), 'Line');
			blockTool = new MenuItemBlock(new BABYLON.Vector3(-8, 0, 0), 'Block');
			dragTool = new MenuItemBlock(new BABYLON.Vector3(8, 0, 8), 'Drag');
			bubbleTool = new MenuItemBlock(new BABYLON.Vector3(8, 0, 0), 'Bubble');
			saveTool = new MenuItemBlock(new BABYLON.Vector3(8, 0, -8), 'Save');
			eraseTool = new MenuItemBlock(new BABYLON.Vector3(-8, 0, -8), 'Erase');
			resetTool = new MenuItemBlock(new BABYLON.Vector3(0, 0, -8), 'Reset');
			uiSwitcher = new MenuItemBlock(new BABYLON.Vector3(0, 0, 8), 'Floor Menu');
			
			lineTool.setActive();
		},
		
		addButtonEvents: function() {
			
			let self = this;

			vrHelper = scene.createDefaultVRExperience();
			vrHelper.enableInteractions();
			vrHelper.teleportationTarget = BABYLON.Mesh.CreateSphere('ground', 4, 0.05, scene);
			
			self.addMeshSelectionEvents();
			self.addDragging();

			const leftHand = BABYLON.Mesh.CreateBox('leftHand', 0.1, scene);
			leftHand.scaling.z = 2;
			leftHand.isVisible = false;

			const rightHand = BABYLON.Mesh.CreateBox('rightHand', 0.1, scene);
			rightHand.scaling.z = 2;
			rightHand.isVisible = false;
			vrHelper.enableTeleportation({
				floorMeshName: 'ground'
			});
			
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
						
						if (stateObject.y > 0.6) {
							if (cursor.length > 0) cursor.length -= .03;
						}
						if (stateObject.y < -0.6) {
							cursor.length += .03;
						}
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
			
			if (activeTool === lineTool) userAddedObjects.push(gfx.createLineArt(rightController.devicePosition, cursor.position, activeColor));
			if (activeTool === blockTool) userAddedObjects.push(gfx.createBlock(rightController, activeColor, cursor));
			if (activeTool === bubbleTool) userAddedObjects.push(gfx.createSphere(rightController, activeColor, cursor));
			if (activeTool === eraseTool && selectedMesh && selectedMesh.userAdded === true) selectedMesh.dispose();
		},
		buttonLeftBackTrigger: function(webVRController) {},
		buttonRightBackTrigger: function(webVRController, stateObject) {},
		buttonLeftSideTrigger: function(webVRController) {},
		buttonRightSideTrigger: function(webVRController, stateObject) {},
		joystickLeft: function(webVRController, stateObject) {},
		joystickRight: function(webVRController, stateObject) {},
		
		setLighting: function() {
			
			var directionalLight = new BABYLON.DirectionalLight('DirectionalLight', new BABYLON.Vector3(0, -1, 0), scene);
			directionalLight.diffuse = new BABYLON.Color3(.4, .4, .4);
			directionalLight.specular = new BABYLON.Color3(0, 0, .1);
			var spotLight = new BABYLON.SpotLight('spotLight', new BABYLON.Vector3(0, 10, 0), new BABYLON.Vector3(0, -1, 0), Math.PI / 3, 2, scene);
			spotLight.diffuse = new BABYLON.Color3(.1, .1, .1);
			spotLight.specular = new BABYLON.Color3(.1, .1, .1);

			var ground = BABYLON.MeshBuilder.CreateGround('ground', { height: 20, width: 20, subdivisions: 4, isPickable: false }, scene);
		},
		
		showBabylonDebugger: function() {
			
			scene.debugLayer.show({
			    overlay: true
			});
		}
	}
}