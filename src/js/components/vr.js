var StartAudioContext = require('startaudiocontext');
var Pizzicato = require('pizzicato');
var howler = require('howler');
var Tuna = require('tunajs');
require('howler-plugin-effect-chain');

module.exports = function () {

	var canvas, engine, scene, camera, vrHelper, tuna;
	var leftController, rightController, rightJoystick, leftJoystick;
	var cursor, draggedMesh, picked, lastPicked, selectedMesh, intersectedMesh, scalingRod = { balloonTotalLength: .3 };
	var activeTool, balloonOrigin, timeCursor, timeCursorOrigin, timeCursorFinal, vinylStart;
	var records = [], menuItems = [], effectors = [], toggles = [];
	var record, desk,  waveformFidelity = 500, albumCount = 0, zBuffer = .01;
	var highlightColor = BABYLON.Color3.FromHexString('#00ffe8'), selectedColor = BABYLON.Color3.FromHexString('#e12d2d'), white = new BABYLON.Color3(1, 1, 1);
	
	var leftSphereToolTip, rightSphereToolTip, beginTurning = false, leftStarterPosition = new BABYLON.Vector3(0, 0, 0), leftControllerPosition = new BABYLON.Vector3(0, 0, 0), intersectedRecord, beginTurningTurnedOn = false, tubeToolTip; // = BABYLON.MeshBuilder.CreateTube('tube', {path: [new BABYLON.Vector3(0,0,0), new BABYLON.Vector3(1,0,0)], radius: 0.1, updatable: true, cap: BABYLON.Mesh.CAP_ALL}, scene);

	let methods = {

		init: function () {
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

		createScene: function () {

			let self = this;

			scene = new BABYLON.Scene(engine);
			scene.clearColor = new BABYLON.Color3(0, 0, 0);

			vrHelper = scene.createDefaultVRExperience();
			vrHelper.onEnteringVRObservable.add(function () {
				self.addButtonEvents();
			});
			vrHelper.onExitingVRObservable.add(function() {
				self.stopAllAudio();
			});

			camera = new BABYLON.ArcRotateCamera('Camera', -Math.PI / 2, Math.PI / 2, 12, BABYLON.Vector3.Zero(), scene);
			camera.position = new BABYLON.Vector3(0, 1.5, -2);
			camera.attachControl(canvas, true);

			self.setLighting();
			self.addDesk();
			self.addCursor();
			self.loadAssets();
			self.addEffects();
			self.addDebugButtons();
			
			return scene;
		},

		addEffects: function () {

			let masterVolumeDial = new MenuItemBlock(new BABYLON.Vector3(.12, 1.16, .9), 'Master Volume');
			masterVolumeDial.effector = new Effector(masterVolumeDial, 0, 1, scalingRod, function (value) {
				if (record) Howler.volume(value);
			});

			let toggleBaseLocation = new BABYLON.Vector3(.24, 1.16, .9);
			let toggleSpacing = .05;

			let moogOptions = {
				cutoff: {
					min: .08,
					max: .4,
					displayName: 'Cutoff'
				},
				resonance: {
					min: 0,
					max: 3,
					displayName: 'Resonance'
				},
				tunaOptions: {
					cutoff: 0.065,    //0 to 1
					resonance: 3.5,   //0 to 4
					bufferSize: 4096  //256 to 16384
				}
			};
			let moog = new tuna.MoogFilter(moogOptions.tunaOptions);
			let moogToggle = new Toggle(gfx.movePoint(toggleBaseLocation, new BABYLON.Vector3(0, 0, -1).scale(toggleSpacing * toggles.length)), 'Moog', moog, moogOptions);

			let bitcrusherOptions = {
				bits: {
					min: 2,
					max: 4,
					displayName: 'Bits'
				},
				normfreq: {
					min: .1,
					max: .4,
					displayName: 'Frequency'
				},
				tunaOptions: {
					bits: 6,          //1 to 16
					normfreq: .1,    //0 to 1
					bufferSize: 4096  //256 to 16384
				}
			};
			let bitcrusher = new tuna.Bitcrusher(bitcrusherOptions.tunaOptions);
			let bitcrusherToggle = new Toggle(gfx.movePoint(toggleBaseLocation, new BABYLON.Vector3(0, 0, -1).scale(toggleSpacing * toggles.length)), 'Bitcrusher', bitcrusher, bitcrusherOptions);

			let delayOptions = {
				delayTime: {
					min: 1,
					max: 800,
					displayName: 'Delay (1-800ms)'
				},
				wetLevel: {
					min: .1,
					max: 1,
					displayName: 'Wet Level'
				},
				dryLevel: {
					min: .1,
					max: 1,
					displayName: 'Dry Level'
				},
				cutoff: {
					min: 20,
					max: 16000,
					displayName: 'Cutoff Frequency'
				},
				tunaOptions: {
					feedback: 0.45,    //0 to 1+
					delayTime: 150,    //1 to 10000 milliseconds
					wetLevel: .5,    //0 to 1+
					dryLevel: .5,       //0 to 1+
					cutoff: 5000,      //cutoff frequency of the built in lowpass-filter. 20 to 22050
					bypass: 0
				}
			};
			let delay = new tuna.Delay(delayOptions.tunaOptions);
			let delayToggle = new Toggle(gfx.movePoint(toggleBaseLocation, new BABYLON.Vector3(0, 0, -1).scale(toggleSpacing * toggles.length)), 'Delay', delay, delayOptions);
			
			let lowpassOptions = {
				frequency: {
					min: 100,
					max: 5000,
					displayName: 'Frequency'
				},
				tunaOptions: {
					frequency: 440, //20 to 22050
					Q: 1, //0.001 to 100
					gain: 40, //-40 to 40 (in decibels)
					filterType: 'lowpass', //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
					bypass: 0
				}
			};
			let lowpass = new tuna.Filter(lowpassOptions.tunaOptions);
			let lowpassToggle = new Toggle(gfx.movePoint(toggleBaseLocation, new BABYLON.Vector3(0, 0, -1).scale(toggleSpacing * toggles.length)), 'Lowpass Filter', lowpass, lowpassOptions);
			
			let bandpassOptions = {
				frequency: {
					min: 20,
					max: 2000,
					displayName: 'Frequency'
				},
				tunaOptions: {
					frequency: 440, //20 to 22050
					Q: 1, //0.001 to 100
					gain: 40, //-40 to 40 (in decibels)
					bandpassType: 'bandpass', //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
					bypass: 0
				}
			};
			let bandpass = new tuna.Filter(bandpassOptions.tunaOptions);
			let bandpassToggle = new Toggle(gfx.movePoint(toggleBaseLocation, new BABYLON.Vector3(0, 0, -1).scale(toggleSpacing * toggles.length)), 'Bandpass Filter', bandpass, bandpassOptions);
			
			let convolverOptions = {
				wetLevel: {
					min: .25,
					max: 1,
					displayName: 'Level'
				},
				tunaOptions: {
					highCut: 22050,                         //20 to 22050
					lowCut: 20,                             //20 to 22050
					dryLevel: .25,                            //0 to 1+
					wetLevel: 1,                            //0 to 1+
					level: 1,                               //0 to 1+, adjusts total output of both wet and dry
					impulse: './src/audio/scala-milan.wav',    //the path to your impulse response
					bypass: 0
				}
			};
			let convolver = new tuna.Convolver(convolverOptions.tunaOptions);
			let convolverToggle = new Toggle(gfx.movePoint(toggleBaseLocation, new BABYLON.Vector3(0, 0, -1).scale(toggleSpacing * toggles.length)), 'Reverb', convolver, convolverOptions);
		},

		everyFrame: function () {

			let self = this;
			if (rightController) {
				self.updateCursor();
				self.updateBalloon();
				self.updateEffectors();
			}
			if (leftController) self.updatePhysicalRecord()
			if (record && record.playing) self.updateRecordProgress();


			if (beginTurning) {
				beginTurningTurnedOn = true;
				if (intersectedRecord) {


					var changeInPlayback = self.calculatePlaybackRate(leftStarterPosition.clone(), leftControllerPosition.clone());

					if (!isNaN(changeInPlayback) && changeInPlayback) {
						intersectedRecord.playbackRate += changeInPlayback / 10;

						if (intersectedRecord.playbackRate <= 0.5) {
							intersectedRecord.playbackRate = 0.5;
						} else if (intersectedRecord.playbackRate >= 2.0) {
							intersectedRecord.playbackRate = 2.0;
						}

						//console.log(intersectedRecord.playbackRate);
						// if (intersectedRecord.playing) {
						//changePlayback Rate of the music based on what is in the record
						// }

						intersectedRecord.audio.rate(intersectedRecord.playbackRate, intersectedRecord.audio.soundID);

						leftStarterPosition = leftControllerPosition.clone();


						//beginTurning = false;
					}
				}
			} else if (beginTurningTurnedOn && !beginTurning) {

				tubeToolTip.isVisible = false;
			}
		},

		updatePhysicalRecord: function () {
			let self = this;
			if (record && desk.vinylPosition && record.inHand) {
				record.transformNode.position = leftController.devicePosition.add(leftController.getForwardRay(1).direction.scale(.25));
				if (gfx.createVector(record.transformNode.position, desk.vinylPosition).length() < .02) self.startRecord(record);
			}
		},

		updateRecordProgress: function () {
			if (record.spinning) record.transformNode.rotate(BABYLON.Axis.Y, .005 * record.audio.rate(), BABYLON.Space.WORLD);
			if (timeCursor && record.progress < 1) {
				timeCursor.position = gfx.createVector(record.timeCursorOrigin, record.timeCursorFinal).scale(record.progress);
			}
			if (record.audio) {
				record.progress = record.audio.seek() / record.audio.duration();
			}
		},

		updateEffectors: function () {

			effectors.forEach(function (effector) {
				effector.update();
			});
		},

		updateBalloon: function () {
			
			if (balloonOrigin) {

				let balloonGroup = new BABYLON.TransformNode();
				if (!scalingRod.initialLength) {
					scalingRod.scalingState = true;
					scalingRod.initialLength = gfx.createVector(leftController.devicePosition, rightController.devicePosition).length();
				}
				let minimumOffset = 1.6;
				let controllerMidpoint = gfx.getMidpoint(leftController.devicePosition, rightController.devicePosition);

				scalingRod.controllersVector = gfx.createVector(leftController.devicePosition, rightController.devicePosition);
				scalingRod.balloonTotalVector = gfx.createVector(rightController.devicePosition, gfx.movePoint(rightController.devicePosition, new BABYLON.Vector3(0, scalingRod.balloonTotalLength, 0)));
				scalingRod.currentLength = scalingRod.controllersVector.length();
				let balloonLength = scalingRod.balloonTotalLength - scalingRod.currentLength;
				if (balloonLength < 0) balloonLength = 0;
				scalingRod.balloonVector = gfx.createVector(balloonOrigin, gfx.movePoint(balloonOrigin, new BABYLON.Vector3(0, 1, 0).scale(balloonLength))).scale(minimumOffset);
				if (scalingRod.balloonVector.length() > scalingRod.balloonTotalLength) scalingRod.balloonVector = scalingRod.balloonVector.normalize().scale(scalingRod.balloonTotalLength);

				if (scalingRod.balloonPositionIndicatorMesh) scalingRod.balloonPositionIndicatorMesh.dispose();
				scalingRod.balloonPositionIndicatorMesh = BABYLON.MeshBuilder.CreateBox('balloon', { size: .01 }, scene);
				scalingRod.balloonPositionIndicatorMesh.parent = balloonGroup;
				scalingRod.balloonPositionIndicatorMesh.isPickable = false;
				scalingRod.balloonPositionIndicatorMesh.position = gfx.movePoint(balloonOrigin, scalingRod.balloonVector);
				if (!scalingRod.balloonPositionIndicatorMesh.material) {
					scalingRod.balloonPositionIndicatorMesh.material = new BABYLON.StandardMaterial('balloonMaterial', scene);
					scalingRod.balloonPositionIndicatorMesh.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
					scalingRod.balloonPositionIndicatorMesh.material.alpha = 0.3;
				}

				// show progress indicators
				if (scalingRod.balloonTotalVectorMesh) scalingRod.balloonTotalVectorMesh.dispose();
				scalingRod.balloonTotalVectorMesh = gfx.createLine(balloonOrigin, scalingRod.balloonTotalVector, new BABYLON.Color3(1, 1, 1), .5);
				scalingRod.balloonTotalVectorMesh.parent = balloonGroup;
				scalingRod.balloonTotalVectorMesh.isPickable = false;
				if (scalingRod.balloonVectorMesh) scalingRod.balloonVectorMesh.dispose();
				scalingRod.balloonVectorMesh = gfx.createLine(balloonOrigin, scalingRod.balloonVector, new BABYLON.Color3(0, 1, 0), .5);
				scalingRod.balloonVectorMesh.isPickable = false;
				scalingRod.balloonVectorMesh.parent = balloonGroup;
				scalingRod.balloonGroup = balloonGroup;
				scalingRod.state = scalingRod.balloonVector.length() / scalingRod.balloonTotalLength; // final 0.0.1 value
			}
			else { // Remove for balloon ghosts?
				if (scalingRod.balloonPositionIndicatorMesh) scalingRod.balloonPositionIndicatorMesh.dispose();
				if (scalingRod.balloonTotalVectorMesh) scalingRod.balloonTotalVectorMesh.dispose();
				if (scalingRod.balloonVectorMesh) scalingRod.balloonVectorMesh.dispose();
			}
		},

		togglePlay: function () {
			let self = this;
			if (record.paused) {
				record.audio.play();
			}
			else if (record.playing) {
				record.audio.pause();
				if (vinylStart) vinylStart.stop();
			}
			else {
				self.startRecord(record);
			}
		},

		//Given the original Tempo (beats per minute) and a playback rate, returns the new tempo.
		//both numbers
		getCurrentSongTempo: function (originalTempo, playbackRate) {
			return originalTempo * playbackRate;
		},

		calculatePlaybackRate(oldPos, newPos) {
			var up = BABYLON.Vector3.Up();

			var oldVec = oldPos.subtract(desk.vinylPosition);
			var newVec = newPos.subtract(desk.vinylPosition);


			tubeToolTip.isVisible = true;
			var u = (oldVec.subtract(up.scale(BABYLON.Vector3.Dot(up, oldVec)))).normalize();
			var v = (newVec.subtract(up.scale(BABYLON.Vector3.Dot(up, newVec)))).normalize();

			var newPath = [];
			newPath.push(desk.vinylPosition);
			newPath.push(desk.vinylPosition.add(v.scale(0.15)));

			tubeToolTip = new BABYLON.MeshBuilder.CreateTube('TubeTip', { path: newPath, instance: tubeToolTip, radius: 0.02 })

			var tubeMat = new BABYLON.StandardMaterial('toolTipSphereMat', scene);
			tubeMat.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
			tubeMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
			tubeMat.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);

			tubeToolTip.material = tubeMat;

			var uDotv = BABYLON.Vector3.Dot(u, v);
			var uCrossv = BABYLON.Vector3.Cross(u, v);

			if (uDotv < 0.1) {
				return 0;
			}

			var sinMag = Math.sqrt(1 - (uDotv * uDotv));
			var clockwise = BABYLON.Vector3.Dot(uCrossv, up) > 0;

			if (clockwise) {
				return sinMag;
			} else {
				return -sinMag;
			}
		},

		startRecord: function (record) {
			let self = this;
			record.audio.stop();
			record.inHand = false;
			record.transformNode.position = desk.vinylPosition;
			if (rightController) rightController.mesh.removeChild(record.transformNode);

			if (vinylStart) vinylStart.play();
			record.spinning = true;

			setTimeout(function () {
				record.audio.soundID = record.audio.play();
			}, 500);
		},

		showSong: function (record) {
			records.forEach(function (thisRecord) {
				thisRecord.dispose();
				if (thisRecord.waveform) thisRecord.waveform.visibility = 0;
			});

			if (timeCursor) timeCursor.dispose();
			timeCursor = gfx.createLineFromPoints(gfx.movePoint(record.timeCursorOrigin, new BABYLON.Vector3(0, record.waveform.minHeight, -zBuffer)), gfx.movePoint(record.timeCursorOrigin, new BABYLON.Vector3(0, record.waveform.maxHeight, -zBuffer)), new BABYLON.Color3(1, 0, 0));
			record.waveform.visibility = 1;
		},

		addDesk: function () {

			BABYLON.OBJFileLoader.MATERIAL_LOADING_FAILS_SILENTLY = false;
			desk = new BABYLON.TransformNode();
			BABYLON.OBJFileLoader.OPTIMIZE_WITH_UV = true;
			BABYLON.SceneLoader.ImportMesh('', './src/obj/', 'AudioEquipmentTuned.gltf', scene, function (meshChildren) {

				for (let i = 0; i < meshChildren.length; i++) {
					meshChildren[i].parent = desk;
				}
				desk.position = new BABYLON.Vector3(0, .2, .75);
				desk.scaling = new BABYLON.Vector3(-.05, -.05, -.05);
				desk.rotate(BABYLON.Axis.Z, Math.PI, BABYLON.Space.WORLD);
				desk.vinylPosition = new BABYLON.Vector3(-.245, 1.165, .76);
			});
		},

		createToolTips: function (webVRController) {
			var pos = webVRController.devicePosition;

			var cSize = 0.08;
			var sSegments = 32;
			var sphere = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: cSize, segments: sSegments }, scene);
			sphere.position = pos;

			var tube = BABYLON.MeshBuilder.CreateTube('tube', { path: [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 0, 0)], radius: 0.015, updatable: true, cap: BABYLON.Mesh.CAP_ALL }, scene);

			var mat = new BABYLON.StandardMaterial('toolTipSphereMat', scene);
			mat.diffuseColor = new BABYLON.Color3(1, 0, 1);
			mat.wireframe = false;
			mat.alpha = 0.2;
			sphere.material = mat;
			sphere.isPickable = false;

			tube.isPickable = false;
			tube.isVisible = false;

			var mat2 = new BABYLON.StandardMaterial('toolTipSphereMat', scene);
			mat2.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
			mat2.diffuseColor = new BABYLON.Color3(1, 1, 1);

			tubeToolTip = tube;
			tube.material = mat2;

			leftSphereToolTip = sphere;
		},

		addButtonEvents: function () {

			let self = this;
			vrHelper.webVROptions.defaultHeight = 2;
			vrHelper.enableInteractions();
			vrHelper.enableTeleportation({
				floorMeshName: 'ground'
			});
			self.deactivateTeleportation();

			vrHelper.onNewMeshPicked.add(function (pickingInfo) { // where controller is resting/pointing, fired upon new target
				picked = pickingInfo.pickedMesh;
				picked.pickingInfo = pickingInfo;

				if (rightController) {

					let isRightControllerPick = gfx.createVector(pickingInfo.ray.origin, rightController.devicePosition).length() < .1;
					if (isRightControllerPick) lastPicked = picked;
					else {
						picked = null;
					}
				}
			});

			vrHelper.onNewMeshSelected.add(function (mesh) { selectedMesh = mesh; });
			vrHelper.onSelectedMeshUnselected.add(function () { selectedMesh = null; });

			vrHelper.onControllerMeshLoadedObservable.add(function (webVRController) {
				if (webVRController.hand === 'left') {
					vrHelper._leftController._laserPointer._isEnabled = false;
					vrHelper._leftController._gazeTracker._isEnabled = false;
					leftController = webVRController;
					leftControllerPosition = webVRController.devicePosition;
					self.createToolTips(leftController);
				}
				if (webVRController.hand === 'right') {
					vrHelper._rightController._laserPointer._isEnabled = false;
					rightController = webVRController;
				}

				if (leftController && webVRController === leftController) {
					leftController.onSecondaryButtonStateChangedObservable.add(function (stateObject) {
						if (stateObject.pressed) {
							self.leftY(leftController);
						}
					});
					leftController.onMainButtonStateChangedObservable.add(function (stateObject) {
						if (stateObject.pressed) {
							self.leftX(leftController);
						}
					});
					leftController.onTriggerStateChangedObservable.add(function (stateObject) {
						if (stateObject.value >= 1) {
							self.leftTrigger(leftController);
						}
						else { self.leftTriggerRelease(); }
					});
					leftController.onSecondaryTriggerStateChangedObservable.add(function (stateObject) {
						if (stateObject.value >= 1) {
							self.leftSecondaryTrigger(leftController, stateObject);
						}
						else { self.leftSecondaryTriggerRelease(); }
					});
					leftController.onPadValuesChangedObservable.add(function (stateObject) {
						leftJoystick = stateObject;
						if (stateObject.y > 0 || stateObject.y < 0) {
							self.joystickLeft(leftController, stateObject);
						}
						else { self.leftJoystickRelease(); }
					});
				}

				if (rightController && webVRController === rightController) {
					rightController.onSecondaryButtonStateChangedObservable.add(function (stateObject) {
						if (stateObject.pressed) {
							self.rightB(rightController, stateObject);
						}
					});
					rightController.onMainButtonStateChangedObservable.add(function (stateObject) {
						if (stateObject.pressed) {
							self.rightA(rightController);
						}
					});
					rightController.onTriggerStateChangedObservable.add(function (stateObject) {
						if (stateObject.value >= 1) {
							self.rightTrigger(rightController, stateObject);
						}
						else { self.rightTriggerRelease(); }
					});
					rightController.onSecondaryTriggerStateChangedObservable.add(function (stateObject) {
						if (stateObject.value >= 1) {
							self.rightSecondaryTrigger(rightController, stateObject);
						}
					});
					rightController.onPadValuesChangedObservable.add(function (stateObject) {
						rightJoystick = stateObject;
						if (stateObject.y > 0 || stateObject.y < 0) {
							self.joystickRight(rightController, stateObject);
						}
						else { self.rightJoystickRelease(); }
					});
				}
			});
		},

		addCursor: function () {

			let self = this;
			cursor = BABYLON.MeshBuilder.CreateIcoSphere('cursor', { radius: .02, subdivisions: 2 }, scene);
			cursor.material = new BABYLON.StandardMaterial('cursorMaterial', scene);
			cursor.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
			cursor.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
			cursor.material.ambientColor = new BABYLON.Color3(1, 0, 0);
			cursor.material.alpha = 0.08;
			cursor.length = .5;
			//cursor.material.wireframe = true;
			cursor.isPickable = false;
		},

		updateCursor: function () {
			let self = this;
			cursor.direction = rightController.getForwardRay(1).direction;
			cursor.ray = new BABYLON.Ray(rightController.devicePosition, cursor.direction, 5);
			cursor.position = rightController.devicePosition.add(rightController.getForwardRay(1).direction.scale(cursor.length));

			let noneIntersected = true;
			menuItems.forEach(function (menuItem) {
				if (menuItem.box.intersectsMesh(cursor)) {
					menuItem.highlight();
					intersectedMesh = menuItem.box;
					noneIntersected = false;
				}
				else {
					menuItem.unhighlight();
				}
				if (noneIntersected) intersectedMesh = null;
			});
		},

		selectRecord: function (picked) {
			let self = this;
			if (picked.name === 'albumCover') {

				if (record && record.audio) {
					record.audio.stop();
				}
				if (record && record.transformNode) record.transformNode.dispose();

				records.forEach(function (thisRecord) {
					if (picked === thisRecord.albumCoverMesh) record = thisRecord;
				});

				record.showRecord();
				record.inHand = true;
				self.showSong(record);
			}
		},

		leftY: function (webVRController) { },
		leftX: function (webVRController) { },
		rightA: function (webVRController) { },
		rightB: function (webVRController) { },
		leftTrigger: function (webVRController) {
			var intersectionsFound = false;
			for (var i = 0; i < records.length; i++) {
				if (records[i].transformNode._children) {
					records[i].transformNode._children.forEach(function (mesh) {
						if (leftSphereToolTip.intersectsMesh(mesh)) {
							intersectionsFound = true;
							intersectedRecord = records[i];
						}
					});
				}
			}

			if (intersectionsFound) {
				beginTurning = true;
				leftStarterPosition = webVRController.devicePosition;
			}
		},
		leftTriggerRelease: function (webVRController) {
			beginTurning = false;
		},
		rightTrigger: function (webVRController, stateObject) {
			let self = this;
			if (picked) self.selectRecord(picked);

			if (self.parentInstanceOf(intersectedMesh, Toggle)) intersectedMesh.getParent().toggleState();
			else if (intersectedMesh && self.parentInstanceOf(intersectedMesh, MenuItemBlock)) intersectedMesh.getParent().setActive();
		},

		parentInstanceOf: function (object, myClass) {
			return object && typeof object.getParent !== 'undefined' && object.getParent() instanceof myClass;
		},

		rightTriggerRelease: function () {
			if (activeTool) activeTool.setInactive();
		},
		leftSecondaryTrigger: function (webVRController) {
			this.activateTeleportation();
		},
		leftSecondaryTriggerRelease: function () {
			vrHelper.teleportationTarget.dispose();
			this.deactivateTeleportation();
		},
		rightSecondaryTrigger: function (webVRController, stateObject) { },
		joystickLeft: function (webVRController, stateObject) {
			this.adjustCursorLength(stateObject);
		},
		leftJoystickRelease: function () { },
		joystickRight: function (webVRController, stateObject) {
			this.adjustCursorLength(stateObject);
		},
		rightJoystickRelease: function () { },
		activateTeleportation: function () {
			vrHelper.teleportationEnabled = true;
			vrHelper._rotationAllowed = true;
			vrHelper.teleportationTarget.dispose();
			vrHelper.teleportationTarget = BABYLON.MeshBuilder.CreateIcoSphere('teleportationTarget', { diameter: .01, subdivisions: 2 }, scene);
			if (!vrHelper.teleportationTarget.material) {
				vrHelper.teleportationTarget.material = new BABYLON.StandardMaterial('teleportationTargetMaterial', scene);
				vrHelper.teleportationTarget.material.emissiveColor = new BABYLON.Color3.Black;
			}
			vrHelper.teleportationTarget.scaling = new BABYLON.Vector3(.2, .2, .2);
			vrHelper.teleportationTarget.onBeforeRenderObservable.add(function (object) {
				vrHelper.teleportationTarget.material.alpha = .25;
			});

			if (vrHelper.teleportationTarget.material) {
				vrHelper.teleportationTarget.material.emissiveColor = new BABYLON.Color3.White;
				vrHelper.teleportationTarget.material.wireframe = true;
			}
		},
		deactivateTeleportation: function () {
			vrHelper.teleportationEnabled = false;
			vrHelper._rotationAllowed = false;
		},

		adjustCursorLength(stateObject) {
			if (stateObject.y > 0.4 && cursor.length > .1) { // low speed
				cursor.speed = -.005;
				cursor.length += cursor.speed;
			}
			if (stateObject.y < -0.4) {
				cursor.speed = .005;
				cursor.length += cursor.speed;
			}
		},

		unselectMenuItemBlocks: function () {
			let self = this;
			menuItems.forEach(function (menuItem) {
				if (!self.parentInstanceOf(menuItem.box, Toggle)) menuItem.setInactive();
				else if (self.parentInstanceOf(menuItem.box, Toggle)) {
					menuItem.hideLabel();
				}
			});
		},

		setLighting: function () {
			let ground = BABYLON.MeshBuilder.CreateGround('ground', { height: 20, width: 20, subdivisions: 4, isPickable: false }, scene);
			ground.isPickable = false;
			let pointLight = new BABYLON.HemisphericLight('HemiLight', new BABYLON.Vector3(0, 10, -5), scene);
			pointLight.intensity = .1;
		},

		stopAllAudio: function () {
			Howler.stop();
		},
		
		disposeGroup: function(transformNode) {
			if (transformNode && transformNode._children) transformNode._children.forEach(function(mesh) {
				mesh.dispose();
			});
		},

		loadAssets: function () {
			let self = this;

			let assetsManager = new BABYLON.AssetsManager(scene);
			vinylStart = new Howl({
				src: ['./src/audio/vinyl-start.wav'],
				preload: true,
				autoplay: false,
				onload: function () { }
			});

			tuna = new Tuna(Howler.ctx);
			StartAudioContext(Howler.ctx);
			Howler.volume(1);

			//assetsManager.addBinaryFileTask('arabesque', './src/audio/arabesque.mp3').albumCover = './src/img/arabesque.jpg';
			//assetsManager.addBinaryFileTask('quimey-neuquen', './src/audio/quimey-neuquen.mp3').albumCover = './src/img/quimey-neuquen.jpg';
			//assetsManager.addBinaryFileTask('tomita', './src/audio/tomita.mp3').albumCover = './src/img/tomita.jpg';
			//assetsManager.addBinaryFileTask('daft-punk', './src/audio/daft-punk.mp3').albumCover = './src/img/daft-punk.jpg';
			//assetsManager.addBinaryFileTask('greenfields', './src/audio/greenfields.mp3').albumCover = './src/img/greenfields.jpg';
			assetsManager.addBinaryFileTask('i-feel-for-you', './src/audio/i-feel-for-you.mp3').albumCover = './src/img/chaka-khan.jpg';
			assetsManager._tasks.forEach(function (task) {
				task.onSuccess = function (thisTask) {
					records.push(new Record(thisTask.url, thisTask.albumCover));
				};
			});
			assetsManager.load();
		},

		addDebugButtons: function () {
			let self = this;
			scene.onPointerDown = function (evt, pickResult) { // click for testing on desktop
				
			};

			document.addEventListener('keyup', function (event) {
				let space = 32;
				if (event.keyCode === space && record) {

					self.togglePlay();
				}
			});
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
			this.playing = false;
			this.playbackRate = 1.0;

			this.babylonAudio = new BABYLON.Sound('Music', this.audioPath, scene, function () { //on audio buffer loaded
				self.audioBuffer = self.babylonAudio._audioBuffer;
				self.waveform = self.createAudioSamples();
				
				self.waveformDragTracker = BABYLON.MeshBuilder.CreatePlane('test', {
					height: self.waveform.height,
					width: timeCursorFinal.x - timeCursorOrigin.x
				}, scene);
				
				self.waveformDragTracker.visibility = 0;				
				
				self.waveformDragTracker.position = gfx.movePoint(gfx.getMidpoint(timeCursorOrigin, timeCursorFinal), new BABYLON.Vector3(0, 0, -.1));
				
				var pointerDragBehavior = new BABYLON.PointerDragBehavior({
					dragAxis: new BABYLON.Vector3(1,0,0),
					useObjectOrientationForDragging: false
				});
				pointerDragBehavior.moveAttached = false;

				pointerDragBehavior.onDragObservable.add((event)=>{
					
					let offset = self.waveform.width / 2;
					let currentPoint = event.dragPlanePoint.x + offset;
					if (event.dragPlanePoint.x > self.timeCursorOrigin.x && event.dragPlanePoint.x < self.timeCursorFinal.x){ 
						
						timeCursor.position.x = currentPoint;
						
						let pickedProgress = currentPoint - timeCursorOrigin.x - offset;
						let newProgress = pickedProgress / self.waveform.width;
						
						self.progress = newProgress;
						let seconds = self.audio.duration(self.audio.soundID) * newProgress;
						self.audio.seek(seconds, self.audio.soundID);
					}
				});
				self.waveformDragTracker.addBehavior(pointerDragBehavior);
				
				timeCursor.dispose();
				self.waveform.visibility = 0;
				self.addAlbumCover();
			},
			{ // sound options
				loop: false,
				autoplay: false,
				useCustomAttenuation: true
			});
			this.audio = new Howl({
				src: [self.audioPath],
				html5: false,
				preload: true,
				autoplay: false,
				onload: function () {

				},
				onpause: function () {
					self.playing = false;
					self.paused = true;
					self.spinning = false;
				},
				onplay: function () {
					self.playing = true;
					self.paused = false;
					self.spinning = true;
				},
				onstop: function () {
					self.playing = false;
					self.paused = false;
					self.spinning = false;
				},
				onend: function () {
					self.playing = false;
					self.paused = false;
					self.spinning = false;
				}
			});

			return this;
		}

		showRecord() {
			let recordMesh = new BABYLON.TransformNode();
			let recordPosition = new BABYLON.Vector3(0, 0, 0);
			let recordVinyl = BABYLON.MeshBuilder.CreateDisc('testRecord', { radius: .3, tessellation: 40, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
			recordVinyl.parent = recordMesh;
			recordVinyl.position = recordPosition;
			recordVinyl.material = new BABYLON.StandardMaterial('recordVinylMat', scene);
			recordVinyl.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
			recordVinyl.material.invertRefractionY = true;
			let recordLabel = BABYLON.MeshBuilder.CreateDisc('recordLabel', { radius: .1, tessellation: 40, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
			recordLabel.parent = recordMesh;
			recordLabel.rotate(BABYLON.Axis.X, Math.PI, BABYLON.Space.WORLD);
			recordLabel.position = gfx.movePoint(recordVinyl.position, new BABYLON.Vector3(0, 0, -zBuffer));
			recordLabel.material = new BABYLON.StandardMaterial('recordLabelMat', scene);
			recordLabel.material.emissiveTexture = new BABYLON.Texture('./src/img/columbia.png', scene);
			let recordLabel2 = recordLabel.clone();
			recordLabel2.position = gfx.movePoint(recordLabel2.position, new BABYLON.Vector3(0, 0, zBuffer * 2));
			recordLabel2.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.WORLD);
			recordMesh.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.WORLD);
			this.transformNode = recordMesh;
			this.transformNode.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
			this.inHand = true;
		}

		dispose() {
			if (this.transformNode._children) this.transformNode._children.forEach(function (mesh) {
				mesh.dispose();
			});
		}

		createAudioSamples() {
			let self = this;
			let audioStreamSamples = self.getAudioSamples(this.audioBuffer);
			let sampleCount = waveformFidelity;
			let scale = .25;
			let baseline = 1.75;
			let samples = [];
			let waveformLength = 3;
			let colors = [];
			let point = null;
			let maxHeight = 0;
			let minHeight = 0;
			for (let i = 0; i < sampleCount; i++) {
				let x = -(waveformLength / 2) + ((waveformLength / sampleCount) * i); // the dividing by 2 centers in view, then divide into sampleCount chunks to get desired length
				let y = (audioStreamSamples[i] * scale) + baseline;
				if (y > maxHeight) maxHeight = y;
				if (y - baseline < minHeight) minHeight = y - baseline;
				let z = 1.25;
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
			timeCursor = gfx.createLineFromPoints(gfx.movePoint(self.timeCursorOrigin, new BABYLON.Vector3(0, minHeight, -zBuffer)), gfx.movePoint(self.timeCursorOrigin, new BABYLON.Vector3(0, maxHeight, -zBuffer)), new BABYLON.Color3(1, 0, 0));
			waveform.height = maxHeight - minHeight;
			waveform.width = self.timeCursorFinal.x - self.timeCursorOrigin.x;
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
			let startingPoint = new BABYLON.Vector3(1.5, 2.25, 1.25);
			this.albumCoverMesh = BABYLON.Mesh.CreatePlane('albumCover', .25, scene);
			this.albumCoverMesh.position = gfx.movePoint(startingPoint, new BABYLON.Vector3(-1, 0, 0).scale(.7 * albumCount));
			this.albumCoverMesh.material = new BABYLON.StandardMaterial('albumCoverMat', scene);
			this.albumCoverMesh.material.emissiveTexture = new BABYLON.Texture(this.albumCover, scene);
		}
	}

	class Effector {

		constructor(menuItem, min, max, interpolator, modifierFunction) {
			let self = this;
			this.modifier = modifierFunction;
			this.interpolator = interpolator;
			this.min = min;
			this.max = max;
			this.menuItem = menuItem;
			effectors.push(this);
		}

		update() {

			if (this.menuItem.active) {
				let state = this.min + (this.max - this.min) * this.interpolator.state;
				if (typeof state === 'number') this.modifier(state);
			}
		}
	}

	class MenuItemBlock {

		constructor(pt, title) {

			let self = this;
			this.position = pt;
			this.active = false;
			this.title = title;
			this.boxSize = .025;
			this.selecting = false;
			this.label = new BABYLON.TransformNode();
			this.box = BABYLON.MeshBuilder.CreateBox('MenuItemBlock', { size: this.boxSize }, scene);
			this.box.isPickable = false;
			this.box.position = new BABYLON.Vector3(pt.x, pt.y + this.boxSize / 2, pt.z);
			this.box.material = new BABYLON.StandardMaterial('menuItemMaterial', scene);
			menuItems.push(this);

			this.initMesh();

			this.box.getParent = function () {
				return self;
			}
		}

		initMesh() {
			let plane = BABYLON.MeshBuilder.CreatePlane('plane', { height: 1, width: 1 }, scene);
			plane.isPickable = false;
			plane.defaultPosition = gfx.movePoint(this.position, new BABYLON.Vector3(0, this.boxSize + .08, 0));
			plane.position = plane.defaultPosition;
			plane.isPickable = false;
			let line = gfx.createLine(gfx.movePoint(this.position, new BABYLON.Vector3(0, this.boxSize + .01, 0)), new BABYLON.Vector3(0, .05, 0), white);
			line.isPickable = false;
			let advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane);
			let label = new BABYLON.GUI.TextBlock();
			label.text = this.title;
			label.color = 'white';
			label.fontSize = 18;
			advancedTexture.addControl(label);
			plane.lookAt(camera.position);
			plane.addRotation(0, Math.PI, 0);
			plane.parent = this.label;
			line.parent = this.label;
			this.label.plane = plane
			this.label.line = line;
			this.hideLabel();
		}
		hide() {
			this.box.visibility = 0;
			this.hideLabel();
		}
		show() {
			this.box.visibility = 1;
		}
		setActive() {
			this.box.material.emissiveColor = selectedColor;
			this.selecting = true;
			this.active = true;
			activeTool = this;
			if (this.balloonGroup) this.balloonGroup.dispose();
			if (this.box.visibility > 0) {
				balloonOrigin = this.position;
				this.elevateLabel();
			}
		}
		setInactive() {
			this.box.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
			this.active = false;
			this.hideLabel()
			balloonOrigin = null;
			console.log('scalingRod.balloonGroup: ', scalingRod.balloonGroup);
			if (this.balloonGroup) this.balloonGroup.dispose();
			//this.balloonGroup = scalingRod.balloonGroup.clone();
		}
		highlight() {
			if (!this.active && !balloonOrigin) {
				this.box.material.emissiveColor = highlightColor;
				this.showLabel();
			}
		}
		unhighlight() {
			if (!this.active) {
				this.box.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
				this.hideLabel();
			}
		}
		hideLabel() {
			this.label.plane.visibility = 0;
			this.label.line.visibility = 0;
		}
		elevateLabel() {
			this.label.plane.visibility = 1;
			this.label.line.visibility = 0;
			this.label.plane.position = gfx.movePoint(this.position, new BABYLON.Vector3(0, scalingRod.balloonTotalLength + .02, 0));
		}
		showLabel() {
			if (this.box.visibility > 0) {
				this.label.plane.position = this.label.plane.defaultPosition;
				this.label.plane.lookAt(camera.position);
				this.label.plane.addRotation(0, Math.PI, 0);
				this.label.plane.visibility = 1;
				this.label.line.visibility = 1;
			}
		}
	}

	class Toggle extends MenuItemBlock {

		constructor(pt, title, effect, effectOptions) {

			super(pt, title);
			let self = this;
			self.effectorDials = [];
			self.effect = effect;
			self.effectOptions = effectOptions;
			toggles.push(self);

			Object.entries(self.effectOptions).forEach(function (item, index) {
				let attribute = item[0];
				if (attribute === 'tunaOptions') return;
				let spacing = .06;
				let location = gfx.movePoint(pt, new BABYLON.Vector3(1, 0, 0).scale(index * spacing + .1));
				let effectorDial = new MenuItemBlock(location, effectOptions[attribute].displayName);
				effectorDial.effector = new Effector(effectorDial, effectOptions[attribute].min, effectOptions[attribute].max, scalingRod, function (value) {
					if (record) self.effect[attribute] = value;
				});
				effectorDial.effector.effect = self.effect;
				self.effectorDials.push(effectorDial);
			});
			self.hideChildren();
		}

		hideChildren() {
			this.effectorDials.forEach(function (dial) {
				dial.hide();
				console.log('dial: ', dial);
				if (dial.balloonGroup) dial.balloonGroup.dispose();
			});
		}
		showChildren() {
			this.effectorDials.forEach(function (dial) {
				dial.show();
			});
		}
		toggleState() {
			if (this.active) this.setInactive();
			else if (!this.active) this.setActive();
		}
		setActive() {
			this.box.material.emissiveColor = selectedColor;
			this.active = true;
			this.showChildren();
			if (this.effect) Howler.addEffect(this.effect);
		}
		setInactive() {
			this.box.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
			this.active = false;
			balloonOrigin = null;
			if (intersectedMesh !== this.box) this.hideLabel();
			this.hideChildren();
			if (this.effect) Howler.removeEffect(this.effect);
		}
		highlight() {
			super.highlight();
			super.showLabel();
		}
		unhighlight() {
			if (this.active) this.hideLabel();
			else {
				this.box.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
				this.hideLabel();
			}
		}
	}

	return methods;
}