import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { VolumeRenderShader1 } from 'three/addons/shaders/VolumeShader.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry.js';

		let renderer,
			scene,
			camera,
			controls,
			material,
			volconfig,
			cmtextures;
		let room;
		const clock = new THREE.Clock();

		let guiScene = null;
		let guiCamera = null;
		let guiGroup = null;

		const parameters = {
				par1: 0.6,
				par2: 0.2,
			};

		init();
		animate();

		function init() {

			scene = new THREE.Scene();

			// Create renderer
			renderer = new THREE.WebGLRenderer();
			renderer.setPixelRatio( window.devicePixelRatio );
			renderer.setSize( window.innerWidth, window.innerHeight );
			renderer.xr.enabled = true;
			renderer.xr.addEventListener('sessionstart', () => {
			// Move the whole scene (or a group) in front of the user
			scene.position.set(0, 0, -3); // 3 meters forward
			});
			document.body.appendChild( renderer.domElement );
			document.body.appendChild(VRButton.createButton(renderer));

			// Create camera (The volume renderer does not work very well with perspective yet)
			const h = 512; // frustum height
			const aspect = window.innerWidth / window.innerHeight;
			camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
			//camera = new THREE.OrthographicCamera( - h * aspect / 2, h * aspect / 2, h / 2, - h / 2, 1, 1000 );
			camera.position.set( 0, 1.6, 3 );
			camera.up.set( 0, 0, 1 ); // In our data, z is up
			//camera.lookAt(0, 0, 0);

			/*
			room = new THREE.LineSegments(
					new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ),
					new THREE.LineBasicMaterial( { color: 0x808080 } )
			);
			room.geometry.translate( 0, 3, 0 );
			scene.add( room );
			*/

			// Lights
			const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
			scene.add(hemiLight);

			const dirLight = new THREE.DirectionalLight(0xffffff, 1);
			dirLight.position.set(1, 2, 1);
			scene.add(dirLight);
			const cube = new THREE.Mesh(
				new THREE.BoxGeometry(3.3, 3.3, 3.3), new THREE.MeshStandardMaterial({ color: 0x00ff00 })
			);
			cube.position.set(0, 1.6, -2); // In front of the headset at eye level
			scene.add(cube);
			
			// Create controls
			controls = new FirstPersonControls( camera, renderer.domElement );
			controls.movementSpeed = 150;
			controls.lookSpeed = 0.1;
			

			// scene.add( new AxesHelper( 128 ) );

			// Lighting is baked into the shader a.t.m.
			// let dirLight = new DirectionalLight( 0xffffff );

			// The gui for interaction
			/*
			volconfig = { clim1: 0, clim2: 1, renderstyle: 'mip', isothreshold: 0.15, colormap: 'viridis' };
			const gui = new GUI();
			gui.add( volconfig, 'clim1', 0, 1, 0.01 ).onChange( updateUniforms );
			gui.add( volconfig, 'clim2', 0, 1, 0.01 ).onChange( updateUniforms );
			gui.add( volconfig, 'colormap', { gray: 'gray', viridis: 'viridis' } ).onChange( updateUniforms );
			gui.add( volconfig, 'renderstyle', { mip: 'mip', iso: 'iso' } ).onChange( updateUniforms );
			gui.add( volconfig, 'isothreshold', 0, 1, 0.01 ).onChange( updateUniforms );
			*/
			let axis = 256;

			// Load the data ...
			/*
			fetch('volumes/Frame01/Volume.raw')
			.then(response => response.arrayBuffer())
			.then(buffer => {
				const dimVolX = 480 , dimVolY = 598 , dimVolZ = 564;
				const data = new Uint8Array(buffer);

				const texture = new THREE.Data3DTexture(data, dimVolX, dimVolY, dimVolZ);
				texture.format = THREE.RedFormat;
				texture.type = THREE.UnsignedByteType;
				texture.minFilter = texture.magFilter = THREE.LinearFilter;
				texture.unpackAlignment = 1;
				texture.needsUpdate = true;

				console.log(texture)

				
				// Colormap textures
				cmtextures = {
					viridis: new THREE.TextureLoader().load( 'textures/cm_viridis.png', render ),
					gray: new THREE.TextureLoader().load( 'textures/cm_gray.png', render )
				};

				// Material
				const shader = VolumeRenderShader1;

				const uniforms = THREE.UniformsUtils.clone( shader.uniforms );
				const sceneX = 117.557, sceneY = 100, sceneZ = 124.498;
				uniforms[ 'u_data' ].value = texture;
				uniforms[ 'u_size' ].value.set( dimVolX, dimVolY, dimVolZ );
				uniforms[ 'u_clim' ].value.set( volconfig.clim1, volconfig.clim2 );
				uniforms[ 'u_renderstyle' ].value = volconfig.renderstyle == 'mip' ? 0 : 1; // 0: MIP, 1: ISO
				uniforms[ 'u_renderthreshold' ].value = volconfig.isothreshold; // For ISO renderstyle
				uniforms[ 'u_cmdata' ].value = cmtextures[ volconfig.colormap ];

				material = new THREE.ShaderMaterial( {
					uniforms: uniforms,
					vertexShader: shader.vertexShader,
					fragmentShader: shader.fragmentShader,
					side: THREE.BackSide // The volume shader uses the backface as its "reference point"
				} );

				// THREE.Mesh
				
				const volumeMatrix = new THREE.Matrix4();

				volumeMatrix.set(
					0, 100, 0, 0,      // Inverse scale for X
					0, 0, -124.498, 0,     // Inverse scale for Z (flip Z)
					-117.557, 0, 0, 0,  // Inverse scale for X (flip X)
					0, 100, -1.36589, 1 // Inverse scale for Y (flip translation)
				);
				const euler = new THREE.Euler(
					THREE.MathUtils.degToRad(90),
					THREE.MathUtils.degToRad(3.415095e-06),
					THREE.MathUtils.degToRad(270),
					'XYZ' // or another order if you require — default is 'XYZ'
				);
				volumeMatrix.set(
					100, 0, 0, 0,      // Inverse scale for X
					0, 123.498, 0, 0,     // Inverse scale for Z (flip Z)
					117.557, 0, 117.557, 0,  // Inverse scale for X (flip X)
					0, 100, -1.36589, 1 // Inverse scale for Y (flip translation)
				);
				
				const euler1 = new THREE.Euler(
					THREE.MathUtils.degToRad(90),
					0,
					0,
					'XYZ'
				);
				const rotMatrix1 = new THREE.Matrix4().makeRotationFromEuler(euler1);

				// Second rotation: (90, 3.415095e-6, 270)
				const euler2 = new THREE.Euler(
					THREE.MathUtils.degToRad(90),
					THREE.MathUtils.degToRad(3.415095e-6),
					THREE.MathUtils.degToRad(270),
					'XYZ'
				);
				const rotMatrix2 = new THREE.Matrix4().makeRotationFromEuler(euler2);

				// Combine: second * first (order matters!)
				const volumeMatrix = new THREE.Matrix4().multiplyMatrices(rotMatrix2, rotMatrix1);
				const euler = new THREE.Euler(
					THREE.MathUtils.degToRad(-90),
					THREE.MathUtils.degToRad(3.415095e-06),
					THREE.MathUtils.degToRad(270),
					'XYZ' // or another order if you require — default is 'XYZ'
				);
				//const volumeMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
				const geometry = new THREE.BoxGeometry( dimVolX, dimVolY, dimVolZ );
				geometry.applyMatrix4(volumeMatrix);
				geometry.translate( dimVolX / 2 - 0.5, dimVolY / 2 - 0.5, dimVolZ / 2 - 0.5 );
				//geometry.translate( 0, sceneY / 2 - 0.5, sceneZ / 2 - 0.5 );

				const mesh = new THREE.Mesh( geometry, material );
				mesh.matrixAutoUpdate = false; // disables automatic updates from position/rotation/scale
				const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(rotMatrix2);

				// Create uniform scale matrix (0.004)
				const scaleMatrix = new THREE.Matrix4().makeScale(
					0.004 * 235.114, 0.004 * 200, 0.004 * 248.996
				);

				// Combine: transform = rotation * scale
				const transformMatrix = new THREE.Matrix4().multiplyMatrices(rotationMatrix, scaleMatrix);
				// You must also set this so Three.js actually uses it as modelMatrix:
				mesh.matrix.copy(transformMatrix);//mesh.modelMatrix = mesh.matrix;

				
				
				let oneMoreMatrix = new THREE.Matrix4();
				oneMoreMatrix.set (
					0, 1, 0, 0,
					0, 0, -1, 0,
					-1, 0, 0, 0,
					0, 0, 0, 1
				);
				const piVival = 3.14159;
				let matrix1 = oneMoreMatrix.makeRotationX(piVival / 2);
				let matrix2 = oneMoreMatrix.makeRotationZ(piVival / 2);
				console.log(piVival);

				//oneMoreMatrix.invert();
				console.log(oneMoreMatrix.invert());
				//scale by axis factor
				//mesh.applyMatrix4(volumeMatrix);
				//mesh.scale.setScalar(5)
				
				//scene.add( mesh );

				const vesselLoader = new OBJLoader();
				const normalShaderMaterial = new THREE.ShaderMaterial({
					vertexShader: `
						varying vec3 vNormal;
						void main() {
							vNormal = normalize(normalMatrix * normal); // Transform normal to view space
							gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
						}
					`,
					fragmentShader: `
						varying vec3 vNormal;
						void main() {
							gl_FragColor = vec4(abs(vNormal), 0.4); // Map normal values to RGB
						}
					`,
					side: THREE.DoubleSide // Show both sides of the mesh
				});

				vesselLoader.load(
					// resource URL
					'meshes/Frame01/MeshesZ0.obj',
					// called when resource is loaded
					function ( object ) {
						const meshMatrix = new THREE.Matrix4();
						meshMatrix.set(
							0.5, 0, 0, 0, 
							0, 0.5, 0, 0,  
							0, 0, 0.5, 0, 
							0, 0, 0, 1  
						);

						// Apply the transformation to the loaded object
						object.applyMatrix4(meshMatrix);
						//dimVolX = 480 , dimVolY = 598 , dimVolZ = 564;
						meshMatrix.set(
							 dimVolX /sceneX, 0, 0, 0, 
							0, dimVolY / sceneY, 0, 0,  
							0, 0, dimVolZ / sceneZ, 0, 
							0, 0, 0, 1  
						);
						//object.applyMatrix4(meshMatrix);
						//object.applyMatrix4(matrix1);
						//object.applyMatrix4(matrix2);
						//object.applyMatrix4(matrix3);
						object.scale.multiplyScalar(1);
						const euler = new THREE.Euler(
							0, // X = 0°
							THREE.MathUtils.degToRad(0), // Y = 270°
							THREE.MathUtils.degToRad(0),  // Z = 90°
							'XYZ' // Default rotation order
						);

						// Create the rotation matrix
						const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
						object.applyMatrix4(rotationMatrix);
						// Apply shader to all meshes inside the object
						object.traverse((child) => {
							if (child.isMesh) {
								child.material = normalShaderMaterial;
							}
						});
						scene.add( object );

					},
					// called when loading is in progress
					function ( xhr ) {

						console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

					},
					// called when loading has errors
					function ( error ) {

						console.log( 'An error happened' );

					}
				);

				render();
				
			})
			.catch(console.error);
			*/

			const vesselLoader = new OBJLoader();
			const normalShaderMaterial = new THREE.ShaderMaterial({
					vertexShader: `
						varying vec3 vNormal;
						void main() {
							vNormal = normalize(normalMatrix * normal); // Transform normal to view space
							gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
						}
					`,
					fragmentShader: `
						varying vec3 vNormal;
						void main() {
							gl_FragColor = vec4(abs(vNormal), 0.4); // Map normal values to RGB
						}
					`,
					side: THREE.DoubleSide // Show both sides of the mesh
			});
			vesselLoader.load(
					// resource URL
					'meshes/Frame01/MeshesZ0.obj',
					// called when resource is loaded
					function ( object ) {
						const meshMatrix = new THREE.Matrix4();
						meshMatrix.set(
							0.5, 0, 0, 0, 
							0, 0.5, 0, 0,  
							0, 0, 0.5, 0, 
							0, 0, 0, 1  
						);

						// Apply the transformation to the loaded object
						object.applyMatrix4(meshMatrix);
						//dimVolX = 480 , dimVolY = 598 , dimVolZ = 564;
						/*meshMatrix.set(
							 dimVolX /sceneX, 0, 0, 0, 
							0, dimVolY / sceneY, 0, 0,  
							0, 0, dimVolZ / sceneZ, 0, 
							0, 0, 0, 1  
						);*/
						//object.applyMatrix4(meshMatrix);
						//object.applyMatrix4(matrix1);
						//object.applyMatrix4(matrix2);
						//object.applyMatrix4(matrix3);
						object.scale.multiplyScalar(1);
						const euler = new THREE.Euler(
							0, // X = 0°
							THREE.MathUtils.degToRad(0), // Y = 270°
							THREE.MathUtils.degToRad(0),  // Z = 90°
							'XYZ' // Default rotation order
						);

						// Create the rotation matrix
						const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
						object.applyMatrix4(rotationMatrix);
						// Apply shader to all meshes inside the object
						object.traverse((child) => {
							if (child.isMesh) {
								child.material = normalShaderMaterial;
							}
						});
						scene.add( object );

					},
					// called when loading is in progress
					function ( xhr ) {

						console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

					},
					// called when loading has errors
					function ( error ) {

						console.log( 'An error happened' );

					}
			);

			render();
			

			window.addEventListener( 'resize', onWindowResize );

			// set up ui
			/*
				guiScene = new THREE.Scene();
				guiScene.background = new THREE.Color( 0x0 );

				guiCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
				guiScene.add( guiCamera );

				const gui = new GUI( { width: 300 } );
				gui.add( parameters, 'radius', 0.0, 1.0 );
				gui.add( parameters, 'tube', 0.0, 1.0 );
				gui.add( parameters, 'tubularSegments', 10, 150, 1 );
				gui.add( parameters, 'radialSegments', 2, 20, 1 );
				gui.add( parameters, 'p', 1, 10, 1 );
				gui.add( parameters, 'q', 0, 10, 1 );
				gui.add( parameters, 'thickness', 0, 1 );
				gui.domElement.style.visibility = 'hidden';

				guiGroup = new InteractiveGroup( renderer, guiCamera );
				guiScene.add( guiGroup );

				const mesh = new HTMLMesh( gui.domElement );
				guiGroup.add( mesh );

				const bbox = new THREE.Box3().setFromObject( guiScene );

				guiLayer = renderer.xr.createQuadLayer( 1.2, .8, new THREE.Vector3( 1.5, 1.5, - 1.5 ), new THREE.Quaternion(), 1280, 800, renderGui );
				scene.add( guiLayer );

				guiCamera.left = bbox.min.x;
				guiCamera.right = bbox.max.x;
				guiCamera.top = bbox.max.y;
				guiCamera.bottom = bbox.min.y;
				guiCamera.updateProjectionMatrix();
				*/

		}

		function updateUniforms() {

			material.uniforms[ 'u_clim' ].value.set( volconfig.clim1, volconfig.clim2 );
			material.uniforms[ 'u_renderstyle' ].value = volconfig.renderstyle == 'mip' ? 0 : 1; // 0: MIP, 1: ISO
			material.uniforms[ 'u_renderthreshold' ].value = volconfig.isothreshold; // For ISO renderstyle
			material.uniforms[ 'u_cmdata' ].value = cmtextures[ volconfig.colormap ];

			render();

		}

		function onWindowResize() {

			//renderer.setSize( window.innerWidth, window.innerHeight );

			camera.updateProjectionMatrix();
			renderer.setSize( window.innerWidth, window.innerHeight );
			controls.handleResize();

			render();

		}
		
		function updateCamera() {
			const direction = new THREE.Vector3();
			camera.getWorldDirection(direction);
			direction.y = 0; // Lock vertical movement
			direction.normalize();

			const right = new THREE.Vector3();
			right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize(); // Right direction

			if (keys["w"]) camera.position.addScaledVector(direction, speed); // Move forward
			if (keys["s"]) camera.position.addScaledVector(direction, -speed); // Move backward
			if (keys["a"]) camera.position.addScaledVector(right, -speed); // Strafe left
			if (keys["d"]) camera.position.addScaledVector(right, speed); // Strafe right
		}

		function animate() {
				renderer.setAnimationLoop( render );
		}

		function render() {
			//if (controls.isLocked) updateCamera();
			controls.update( clock.getDelta() );
			renderer.render( scene, camera );

		}

		function renderGui() {

				renderer.render( guiScene, guiCamera );

		}