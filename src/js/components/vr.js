module.exports = function() {
	
	var canvas, engine, scene, camera, vrHelper;
	var menuItems = [], scalingRod = {};
	var frameCount = 0;
	var leftController, rightController, rightJoystick, leftJoystick, selectedMesh, draggedMesh;
	var red = new BABYLON.Color3(1, 0, 0), green = new BABYLON.Color3(0, 1, 0), green = new BABYLON.Color3(0, 1, 0), white = new BABYLON.Color3(1, 1, 1), black = new BABYLON.Color3(0, 0, 0);
	
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
			
			vrHelper = scene.createDefaultVRExperience();
			vrHelper.onEnteringVRObservable.add(function() {
				self.addButtonEvents();
			});
			self.setLighting();
			self.addDesk();
			
			self.showAudioSamples('./src/audio/greenfields.mp3');
			
			scene.clearColor = new BABYLON.Color3(0, 0, 0);
			return scene;
		},

		//Pass in the song url and the playback rate to play the song at a specific rate
		//Will return the actual music. You can later use the music to change parts of it.
		playSong: function(url, playbackRate) {
			var music = new BABYLON.Sound('Music', url, scene, null, {
				loop: false,
				autoplay: false,
				useCustomAttenuation: true
			  });

			music.setPlaybackRate(playbackRate);
			music.play();

			return music;
		},

		//Given the original Tempo (beats per minute) and a playback rate, returns the new tempo.
		//both numbers
		getCurrentSongTempo: function(originalTempo, playbackRate) {
			return originalTempo * playbackRate;
		},

		getSongProgress(music) {
			// TODO: figure out how to get the current progress of the music passed in.
			// Length of the music should be music._length, so in theory this should just  
			// return currentProgress / totalLength;
		},
		
		everyFrame: function() {
			
			frameCount++;
		},
		
		addDesk: function() {
			
			BABYLON.OBJFileLoader.MATERIAL_LOADING_FAILS_SILENTLY = false;
			
			var desk = new BABYLON.TransformNode();
			BABYLON.OBJFileLoader.OPTIMIZE_WITH_UV = true;
			BABYLON.SceneLoader.ImportMesh('', './src/obj/', 'AudioEquipmentTexture.gltf', scene, function(meshChildren) {

				for (let i = 0; i < meshChildren.length; i++) {
					meshChildren[i].parent = desk;
				}
				desk.position.x = 0, desk.position.y = .1, desk.position.z = 0;
				desk.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.WORLD);
				desk.scaling = new BABYLON.Vector3(.05, .05, .05);
			});
		},
		
		addButtonEvents: function() {
			
			let self = this;
			vrHelper.enableInteractions();
			vrHelper.enableTeleportation({
				floorMeshName: 'ground'
			});
			self.deactivateTeleportation();
			vrHelper.teleportationTarget = BABYLON.Mesh.CreateSphere('ground', 4, 0.05, scene);
			vrHelper._teleportBackwardsVector = new BABYLON.Vector3(0, -.1, -.1);
			console.log('vrHelper: ', vrHelper);
			
			vrHelper.onNewMeshPicked.add(pickingInfo => { // where controller is resting/pointing
				//console.log(pickingInfo); //Callback receiving ray cast picking info
			});
			
			vrHelper.onControllerMeshLoadedObservable.add(function(webVRController) {
				if (webVRController.hand === 'left') {
					vrHelper._leftController._laserPointer._isEnabled = false;
					vrHelper._leftController._gazeTracker._isEnabled = false;
					leftController = webVRController;
				}
				if (webVRController.hand === 'right') {
					vrHelper._rightController._laserPointer._isEnabled = false;
					rightController = webVRController;
				}
				
				if (leftController && webVRController === leftController) {
					leftController.onSecondaryButtonStateChangedObservable.add(function(stateObject) {
						if (stateObject.pressed) {
							self.leftY(leftController);
						}
					});
					leftController.onMainButtonStateChangedObservable.add(function(stateObject) {
						if (stateObject.pressed) {
							self.leftX(leftController);
						}
					});
					leftController.onTriggerStateChangedObservable.add(function(stateObject) {
						if (stateObject.value >= 1) {
							self.leftTrigger(leftController);
						}
					});
					leftController.onSecondaryTriggerStateChangedObservable.add(function(stateObject) {
						if (stateObject.value >= 1) {
							self.leftSecondaryTrigger(leftController, stateObject);
						}
						else { self.leftSecondaryTriggerRelease(); }
					});
					leftController.onPadValuesChangedObservable.add(function(stateObject) {
						leftJoystick = stateObject;
						if (stateObject.y > 0 || stateObject.y < 0) {
							self.joystickLeft(leftController, stateObject);
						}
						else { self.leftJoystickRelease(); }
					});
				}
				
				if (rightController && webVRController === rightController) {
					rightController.onSecondaryButtonStateChangedObservable.add(function(stateObject) {
						if (stateObject.pressed) {
							self.rightB(rightController, stateObject);
						}
					});
					rightController.onMainButtonStateChangedObservable.add(function(stateObject) {
						if (stateObject.pressed) {
							self.rightA(rightController);
						}
					});
					rightController.onTriggerStateChangedObservable.add(function(stateObject) {
						if (stateObject.value >= 1) {
							self.rightTrigger(rightController, stateObject);
						}
						else { self.rightTriggerRelease(); }
					});
					rightController.onSecondaryTriggerStateChangedObservable.add(function(stateObject) {
						if (stateObject.value >= 1) {
							self.rightSecondaryTrigger(rightController, stateObject);
						}
					});
					rightController.onPadValuesChangedObservable.add(function(stateObject) {
						rightJoystick = stateObject;
						if (stateObject.y > 0 || stateObject.y < 0) {
							self.joystickRight(rightController, stateObject);
						}
						else { self.rightJoystickRelease(); }
					});
				}
			});
		},
		
		leftY: function(webVRController) {
			console.log('play song');
			this.playSong('./src/audio/greenfields.mp3', 1);
		},
		leftX: function(webVRController) {},
		rightA: function(webVRController) {},
		rightB: function(webVRController) {},
		leftTrigger: function(webVRController) {},
		rightTrigger: function(webVRController, stateObject) {},
		rightTriggerRelease: function() {},
		leftSecondaryTrigger: function(webVRController) {
			this.activateTeleportation();
		},
		leftSecondaryTriggerRelease: function() {
			vrHelper.teleportationTarget.dispose();
			this.deactivateTeleportation();
		},
		rightSecondaryTrigger: function(webVRController, stateObject) {},
		joystickLeft: function(webVRController, stateObject) {},
		leftJoystickRelease: function() {},
		joystickRight: function(webVRController, stateObject) {},
		rightJoystickRelease: function() {},
		activateTeleportation: function() {
			vrHelper.teleportationEnabled = true;
			vrHelper._rotationAllowed = true;
			vrHelper.teleportationTarget.dispose();
			vrHelper.teleportationTarget = BABYLON.MeshBuilder.CreateIcoSphere('teleportationTarget', { diameter: .01, subdivisions: 2 }, scene);
			if (!vrHelper.teleportationTarget.material) {
				vrHelper.teleportationTarget.material = new BABYLON.StandardMaterial('teleportationTargetMaterial', scene);
				vrHelper.teleportationTarget.material.emissiveColor = new BABYLON.Color3.Black;
			}
			vrHelper.teleportationTarget.scaling = new BABYLON.Vector3(.2, .2, .2);
			vrHelper.teleportationTarget.onBeforeRenderObservable.add(function(object) {
				vrHelper.teleportationTarget.material.alpha = .25;
			});
			
			if (vrHelper.teleportationTarget.material) {
				vrHelper.teleportationTarget.material.emissiveColor = new BABYLON.Color3.White;
				vrHelper.teleportationTarget.material.wireframe = true;
			}
		},
		
		deactivateTeleportation: function() {
			vrHelper.teleportationEnabled = false;
			vrHelper._rotationAllowed = false;
		},
		
		setLighting: function() {
			
			var hemisphericLight = new BABYLON.HemisphericLight('HemiLight', new BABYLON.Vector3(0, 1, 0), scene);
			hemisphericLight.intensity = .1;
			var pointLight = new BABYLON.PointLight('pointLight', new BABYLON.Vector3(0, 2, 0), scene);
			pointLight.intensity = .7;
			var ground = BABYLON.MeshBuilder.CreateGround('ground', { height: 20, width: 20, subdivisions: 4, isPickable: false }, scene);
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
				var colors = [];
				for (var i = 0; i < 1000; i++) {
					let x = -(waveformLength/2) + ((waveformLength/1000) * i); // the dividing by 2 centers in view, then divide into 1000 chunks to get desired length
					let y = audioStreamSamples[i] + 2;
					let z = 3;
					colors.push(new BABYLON.Color4(0, 1, 0, 1));
					samples.push(new BABYLON.Vector3(x, y, z));
				}
				var audioCurve = new BABYLON.Curve3(samples);
				var points = audioCurve.getPoints();
				var path3d = new BABYLON.Path3D(points);
				var curve = path3d.getCurve();
				var waveform = BABYLON.Mesh.CreateLines('curve', curve, scene);
			});
		},
		
		getAudioSamples: function(audioBuffer) {
			let rawData = audioBuffer.getChannelData(0);
			let samples = 1000;
			let blockSize = Math.floor(rawData.length / samples);
			let samplesArray = [];
			for (let i = 0; i < samples; i++) {
				let blockStart = blockSize * i;
				let sum = 0;
				for (let j = 0; j < blockSize; j++) {
					sum = sum + Math.abs(rawData[blockStart + j]); // find the sum of all the samples in the block
				}
				samplesArray.push(sum / blockSize); // divide the sum by the block size to get the average
			}
			return samplesArray;
		}
	}
}