var StartAudioContext = require('startaudiocontext');
var pizzicato = require('pizzicato');
var howler = require('howler');

module.exports = function() {
	
	var canvas, engine, scene, camera, vrHelper;
	var leftController, rightController, rightJoystick, leftJoystick, draggedMesh, picked, scalingRod = {};
	var red = new BABYLON.Color3(1, 0, 0), green = new BABYLON.Color3(0, 1, 0), green = new BABYLON.Color3(0, 1, 0), white = new BABYLON.Color3(1, 1, 1), black = new BABYLON.Color3(0, 0, 0), zBuffer = .01;
	var record, records = [], desk, testPoint, showTestPoints = false, timeCursor, timeCursorOrigin, timeCursorFinal, waveformFidelity = 1000, albumCount = 0, vinylStart;
	
	let methods = {
		
		init: function() {
			let self = this;
			
			canvas = document.getElementById('renderCanvas');
			engine = new BABYLON.Engine(canvas, true, {
				preserveDrawingBuffer: true,
				stencil: true
			});
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
			self.loadAssets();
			
			scene.onPointerDown = function (evt, pickResult) { // click
				if (pickResult.hit) {
					picked = pickResult.pickedMesh;
					if (picked.name === 'albumCover') self.selectRecord(picked);
				}
			};
			
			document.addEventListener('keyup', function(event) {
				let space = 32;
				if (event.keyCode === space && record) {
					if (record.paused) {
						record.audio.play();
					}
					else if (record.audio.playing()) {
						record.audio.pause();
						if (vinylStart) vinylStart.stop();
					}
					else {
						self.startRecord(record);
					}
				}
			});
			
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
			
			return (music.audio._inputAudioNode.context.currentTime - music.audio._startTime + music.audio._startOffset) / music.audio._audioBuffer.duration; //edit as needed
		},
		
		everyFrame: function() {
			
			let self = this;
			if (rightController && leftController) {
				
				if (record && desk.vinylPosition && record.inHand) {
					record.transformNode.position = leftController.devicePosition.add(leftController.getForwardRay(1).direction.scale(.25));
					if (gfx.createVector(record.transformNode.position, desk.vinylPosition).length() < .02) self.startRecord(record);
				}
			}
			if (record && record.spinning)record.transformNode.rotate(BABYLON.Axis.Y, .005, BABYLON.Space.WORLD);
			if (record && record.audio.playing()) {
				
				if (timeCursor && record.progress < 1) {
					timeCursor.position = gfx.createVector(record.timeCursorOrigin, record.timeCursorFinal).scale(record.progress);
				}
				if (record.audio) {
					record.progress = record.audio.seek() / record.audio.duration();
				}
			}
		},
		
		startRecord: function(record) {
			let self = this;
			record.audio.stop();
			record.inHand = false;
			record.transformNode.position = desk.vinylPosition;
			if (rightController) rightController.mesh.removeChild(record.transformNode);

			if (vinylStart) vinylStart.play();
			record.spinning = true;
			
			setTimeout(function() {
				record.audio.play();
			}, 500);
		},
		
		showSong: function(record) {
			records.forEach(function(thisRecord) {
				thisRecord.dispose();
				thisRecord.waveform.visibility = 0;
			});
			
			if (timeCursor) timeCursor.dispose();
			timeCursor = gfx.createLineFromPoints(gfx.movePoint(record.timeCursorOrigin, new BABYLON.Vector3(0, record.waveform.minHeight, -zBuffer)), gfx.movePoint(record.timeCursorOrigin, new BABYLON.Vector3(0, record.waveform.maxHeight, -zBuffer)), new BABYLON.Color3(1, 0, 0));
			record.waveform.visibility = 1;
		},
		
		addDesk: function() {
			
			BABYLON.OBJFileLoader.MATERIAL_LOADING_FAILS_SILENTLY = false;
			
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
				
				let box = BABYLON.MeshBuilder.CreateBox('testPoint', {
					size: .01
				}, scene);
				box.position = desk.vinylPosition;
				box.material = new BABYLON.StandardMaterial('testPoint', scene);
				box.material.emissiveColor = new BABYLON.Color3(0, 1, 0);
				testPoint = BABYLON.MeshBuilder.CreateBox('testPoint', {
					size: .1
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
			//console.log('vrHelper: ', vrHelper);
			
			vrHelper.onNewMeshPicked.add(pickingInfo => { // where controller is resting/pointing, fired upon new target
				picked = pickingInfo.pickedMesh;
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
		
		selectRecord: function(picked) {
			let self = this;
			if (picked && (picked.name === 'albumCover')) {
				
				if (record && record.audio) {
					record.audio.stop();
				}
				if (record && record.transformNode) record.transformNode.dispose();
				
				records.forEach(function(thisRecord) {
					if (picked === thisRecord.albumCoverMesh) record = thisRecord;
				});
				
				record.showRecord();
				record.inHand = true;
				self.showSong(record);
			}
		},
		
		leftY: function(webVRController) {},
		leftX: function(webVRController) {},
		rightA: function(webVRController) {},
		rightB: function(webVRController) {},
		leftTrigger: function(webVRController) {},
		rightTrigger: function(webVRController, stateObject) {
			let self = this;
			if (picked.name === 'albumCover') self.selectRecord(picked);
		},
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
		
		loadAssets: function() {
			let self = this;
			let assetsManager = new BABYLON.AssetsManager(scene);
			vinylStart = new Howl({
				src: ['./src/audio/vinyl-start.wav'],
				preload: true,
				autoplay: false
			});
			assetsManager.addBinaryFileTask('i-feel-for-you', './src/audio/i-feel-for-you.mp3').albumCover = './src/img/chaka-khan.jpg';
			assetsManager.addBinaryFileTask('greenfields', './src/audio/greenfields.mp3').albumCover = './src/img/greenfields.jpg';
			assetsManager.addBinaryFileTask('quimey-neuquen', './src/audio/quimey-neuquen.mp3').albumCover = './src/img/quimey-neuquen.jpg';
			
			assetsManager._tasks.forEach(function(task) {
				task.onSuccess = function(thisTask) {
					records.push(new Record(thisTask.url, thisTask.albumCover));
					StartAudioContext(Howler.ctx);
				};
			});
			assetsManager.load();
		}
	};
	
	class Record {
		
		constructor(audioPath, albumCover) {
			let self = this;
			this.transformNode = new BABYLON.TransformNode();
			this.inHand = false;
			this.progress = 0;
			this.audioPath = audioPath;
			this.albumCover = albumCover;
			this.paused = false;
			this.spinning = false;
			
			this.babylonAudio = new BABYLON.Sound('Music', this.audioPath, scene, function() { //on audio buffer loaded
				self.audioBuffer = self.babylonAudio._audioBuffer;
				self.waveform = self.createAudioSamples();
				self.waveform.visibility = 0;
				self.addAlbumCover();
				StartAudioContext(self.babylonAudio._inputAudioNode.context);
			},
			{ // sound options
				loop: false,
				autoplay: false,
				useCustomAttenuation: true
			});
			this.audio = new Howl({
				src: [self.audioPath],
				preload: true,
				autoplay: false,
				onload: function() {
					
				},
				onpause: function() {
					self.paused = true;
					self.spinning = false;
				},
				onplay: function() {
					self.paused = false;
					self.spinning = true;
				},
				onstop: function() {
					self.paused = false;
					self.spinning = false;
				}
			});
			return this;
		}
		
		showRecord() {
			let recordLabel = BABYLON.MeshBuilder.CreateDisc('record', { radius: .3, tessellation: 40, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
			recordLabel.rotate(BABYLON.Axis.X, Math.PI/2, BABYLON.Space.WORLD);
			recordLabel.parent = this.transformNode;
			recordLabel.material = new BABYLON.StandardMaterial('innderDiscMat', scene);
			recordLabel.material.emissiveColor = new BABYLON.Color3.Red;
			recordLabel.position = new BABYLON.Vector3(0, zBuffer, 0);
			recordLabel.isPickable = false;
			let recordLabelBack = recordLabel.clone();
			recordLabelBack.position = new BABYLON.Vector3(0, -zBuffer, zBuffer);
			let vinyl = BABYLON.MeshBuilder.CreateDisc('record', { radius: .9, tessellation: 6, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
			vinyl.rotate(BABYLON.Axis.X, Math.PI/2, BABYLON.Space.WORLD);
			vinyl.parent = this.transformNode;
			vinyl.position = new BABYLON.Vector3(0, 0, 0);
			vinyl.clone().position = new BABYLON.Vector3(0, 0, 0);
			this.transformNode.scaling = new BABYLON.Vector3(.2, .2, .2);
			this.inHand = true;
		}
		
		dispose() {
			if (this.transformNode._children) this.transformNode._children.forEach(function(mesh) {
				mesh.dispose();
			});
		}
		
		createAudioSamples() {
			
			let self = this;
			let audioStreamSamples = self.getAudioSamples(this.audioBuffer);
			let sampleCount = waveformFidelity;
			let scale = .25;
			let baseline = 2;
			let samples = [];
			let waveformLength = 3;
			let colors = [];
			let point = null;
			let maxHeight = 0;
			let minHeight = 0;
			for (let i = 0; i < sampleCount; i++) {
				let x = -(waveformLength/2) + ((waveformLength/sampleCount) * i); // the dividing by 2 centers in view, then divide into sampleCount chunks to get desired length
				let y = (audioStreamSamples[i] * scale) + baseline;
				if (y > maxHeight) maxHeight = y;
				if (y-baseline < minHeight) minHeight = y-baseline;
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
			waveform.isPickable = false;
			maxHeight = maxHeight - timeCursorOrigin.y;
			self.timeCursorOrigin = timeCursorOrigin, self.timeCursorFinal = timeCursorFinal;
			waveform.minHeight = minHeight;
			waveform.maxHeight = maxHeight;
			return waveform;
		}
		
		getAudioSamples(audioBuffer) {
			let rawData = audioBuffer.getChannelData(0);
			let sampleCount = waveformFidelity;
			let blockSize = Math.floor(rawData.length / sampleCount);
			let samplesArray = [];
			for (let i = 0; i < sampleCount; i++) {
				samplesArray.push(rawData[blockSize * i]); // divide the sum by the block size to get the average
			}
			return samplesArray;
		}
		
		addAlbumCover() {
			albumCount++;
			let startingPoint = new BABYLON.Vector3(1.5, 1.5, 1);
			this.albumCoverMesh = BABYLON.Mesh.CreatePlane('albumCover', .25, scene);
			this.albumCoverMesh.position = gfx.movePoint(startingPoint, new BABYLON.Vector3(-1, 0, 0).scale(.7 * albumCount));
			this.albumCoverMesh.material = new BABYLON.StandardMaterial('albumCoverMat', scene);
			this.albumCoverMesh.material.emissiveTexture = new BABYLON.Texture(this.albumCover, scene);
		}
	}
	
	return methods;
}