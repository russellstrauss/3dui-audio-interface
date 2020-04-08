module.exports = function() {
	
	var canvas, engine, scene, camera, vrHelper;
	var leftController, rightController, rightJoystick, leftJoystick, selectedMesh, draggedMesh, scalingRod = {};
	var red = new BABYLON.Color3(1, 0, 0), green = new BABYLON.Color3(0, 1, 0), green = new BABYLON.Color3(0, 1, 0), white = new BABYLON.Color3(1, 1, 1), black = new BABYLON.Color3(0, 0, 0), zBuffer = .01;
	var record, desk, testPoint, showTestPoints = false, timeCursor, timeCursorOrigin, timeCursorFinal;
	
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
			scene.ambientColor = new BABYLON.Color3(1, 0, 0);
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
			
			self.showAudioSamples('./src/audio/quimey-neuquen.mp3');
			
			scene.clearColor = new BABYLON.Color3(0, 0, 0);
			return scene;
		},

		//Pass in the song url and the playback rate to play the song at a specific rate
		//Will return the actual music. You can later use the music to change parts of it.

		//later use music.pause() to pause it and music.play() to play again
		playSong: function(url, playbackRate) {
			var music = new BABYLON.Sound('Music', url, scene, null, {
				loop: false,
				autoplay: true,
				useCustomAttenuation: true
			  });

			music.setPlaybackRate(playbackRate);

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
			
			let self = this;
			if (rightController) {
				
				if (desk.vinylPosition && record.inHand) {
					record.position = rightController.devicePosition.add(rightController.getForwardRay(1).direction.scale(.15));
					if (gfx.createVector(record.position, desk.vinylPosition).length() < .01) self.startRecord(record);
					testPoint.position = record.position;
				}
			}
			
			if (record.playing) {
				record.rotate(BABYLON.Axis.Y, .005, BABYLON.Space.WORLD);
				if (timeCursor && record.progress < 1) {
					timeCursor.position = gfx.createVector(timeCursorOrigin, timeCursorFinal).scale(record.progress);
				}
				if (record.audio && record.audio._audioBuffer) record.progress = record.audio._inputAudioNode.context.currentTime / record.audio._audioBuffer.duration;
			}
		},
		
		startRecord: function(record) {
			let self = this;
			self.playSong('./src/audio/vinyl-start.wav', 1);
			record.inHand = false;
			record.position = desk.vinylPosition;
			record.playing = true;
			record.pinhole.material.alpha = 0;
			rightController.mesh.removeChild(record);
			setTimeout(function() {
				record.audio = self.playSong(record.audioPath, 1);
			}, 1000);
		},
		
		addDesk: function() {
			
			BABYLON.OBJFileLoader.MATERIAL_LOADING_FAILS_SILENTLY = false;
			
			record = new BABYLON.TransformNode();
			let disc = BABYLON.MeshBuilder.CreateDisc('record', { radius: .8, tessellation: 40, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
			disc.parent = record;
			disc.material = new BABYLON.StandardMaterial('discMat', scene);
			disc.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
			disc.position = new BABYLON.Vector3(0, 0, 0);
			disc.rotate(BABYLON.Axis.X, Math.PI, BABYLON.Space.WORLD);
			let recordLabel = BABYLON.MeshBuilder.CreateDisc('record', { radius: .3, tessellation: 40, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
			recordLabel.parent = record;
			recordLabel.material = new BABYLON.StandardMaterial('innderDiscMat', scene);
			recordLabel.material.emissiveColor = new BABYLON.Color3.Red;
			recordLabel.position = new BABYLON.Vector3(0, 0, -zBuffer);
			let recordLabelBack = recordLabel.clone();
			recordLabelBack.position = new BABYLON.Vector3(0, 0, zBuffer);
			let recordPinhole = disc.clone();
			record.pinhole = recordPinhole;
			recordPinhole.parent = record;
			recordPinhole.scaling = new BABYLON.Vector3(.03, .03, .03);
			recordPinhole.position = new BABYLON.Vector3(0, 0, zBuffer*2);
			recordPinhole.clone().position = new BABYLON.Vector3(0, 0, -zBuffer*2);
			record.scaling = new BABYLON.Vector3(.2, .2, .2);
			record.rotate(BABYLON.Axis.X, Math.PI/2, BABYLON.Space.WORLD);
			record.inHand = true;
			record.playing = false;
			record.progress = 0;
			record.audioPath = './src/audio/quimey-neuquen.mp3';
			
			console.log(record);
			record._children.forEach(function(mesh) {
				mesh.isPickable = false;
			});
			
			desk = new BABYLON.TransformNode();
			BABYLON.OBJFileLoader.OPTIMIZE_WITH_UV = true;
			BABYLON.SceneLoader.ImportMesh('', './src/obj/', 'AudioEquipmentTexture.gltf', scene, function(meshChildren) {

				for (let i = 0; i < meshChildren.length; i++) {
					meshChildren[i].parent = desk;
				}
				desk.position.x = 0, desk.position.y = .1, desk.position.z = 0;
				desk.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.WORLD);
				desk.scaling = new BABYLON.Vector3(.05, .05, .05);
				desk.vinylPosition = new BABYLON.Vector3(-.42, 1.11, .005);
				
				var box = BABYLON.MeshBuilder.CreateBox('testPoint', {
					size: .01
				}, scene);
				box.position = desk.vinylPosition;
				box.material = new BABYLON.StandardMaterial('testPoint', scene);
				box.material.emissiveColor = new BABYLON.Color3(0, 1, 0);
				testPoint = BABYLON.MeshBuilder.CreateBox('testPoint', {
					size: .01
				}, scene);
				testPoint.material = new BABYLON.StandardMaterial('testPoint', scene);
				testPoint.material.emissiveColor = new BABYLON.Color3(0, 1, 0);
				testPoint.isPickable = false;
				if (!showTestPoints) {
					testPoint.material.alpha = 0;
					box.material.alpha = 0;
				}
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
					// rightController.mesh.addChild(record);
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
			//this.playSong('./src/audio/greenfields.mp3', 1);
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
			
			let hemisphericLight = new BABYLON.HemisphericLight('HemiLight', new BABYLON.Vector3(0, 10, 0), scene);
			hemisphericLight.intensity = .1;
			let ground = BABYLON.MeshBuilder.CreateGround('ground', { height: 20, width: 20, subdivisions: 4, isPickable: false }, scene);
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
				let scale = 1.5;
				let samples = [];
				let waveformLength = 3;
				let colors = [];
				let point = null;
				let maxHeight = 0;
				for (let i = 0; i < 1000; i++) {
					let x = -(waveformLength/2) + ((waveformLength/1000) * i); // the dividing by 2 centers in view, then divide into 1000 chunks to get desired length
					let y = (audioStreamSamples[i] * scale) + 1.25;
					if (y > maxHeight) maxHeight = y;
					let z = 1;
					point = new BABYLON.Vector3(x, y, z);
					if (i === 0) timeCursorOrigin = point;
					colors.push(new BABYLON.Color4(0, 1, 0, 1));
					samples.push(point);
				}
				timeCursorFinal = point;
				let audioCurve = new BABYLON.Curve3(samples);
				let points = audioCurve.getPoints();
				let path3d = new BABYLON.Path3D(points);
				let curve = path3d.getCurve();
				let waveform = BABYLON.Mesh.CreateLines('curve', curve, scene);
				maxHeight = maxHeight - timeCursorOrigin.y;
				timeCursor = gfx.createLineFromPoints(gfx.movePoint(timeCursorOrigin, new BABYLON.Vector3(0, 0, -zBuffer)), gfx.movePoint(timeCursorOrigin, new BABYLON.Vector3(0, maxHeight, -zBuffer)), new BABYLON.Color3(1, 0, 0));
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