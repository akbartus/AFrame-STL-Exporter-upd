/**
 * @author hassadee / https://hassadee.com/
 * @update akbartus / https://github.com/akbartus
 */

/* Global AFRAME */
if (typeof AFRAME === "undefined") {
  throw new Error(
    "Component attempted to register before AFRAME was available."
  );
}

/**
 * STL Exporter component for A-Frame.
 */
AFRAME.registerSystem("stl-exporter", {
  schema: {
    verbose: { default: false },
  },

	init: function () {
		// Correct rotation
		var scene = document.querySelector("a-scene");
		scene.setAttribute('rotation', {x: 90, y: 0, z: 0})
		// Exporter
		this.exporter = new THREE.STLExporter();
		
  },


  export: function (input, options) {
    console.log("export");	
    var inputObject;
    var link = document.createElement("a");

    if (typeof input === "undefined") {
      inputObject = this.sceneEl.object3D;
    } else {
		inputObject = input.object3D;
    }

    function save(blob, filename) {
      link.href = URL.createObjectURL(blob);
      link.download = filename || "data.json";
      link.dispatchEvent(new MouseEvent("click"));
    }

    function saveArrayBuffer(buffer, filename) {
      save(new Blob([buffer], { type: "application/octet-stream" }), filename);
    }

    function saveString(text, filename) {
      save(new Blob([text], { type: "text/plain" }), filename);
    }

    if (options && options.binary === true) {
      saveArrayBuffer(
        this.exporter.parse(inputObject, { binary: true }),
        "model-binary.stl"
      );
    } else {
      saveString(this.exporter.parse(inputObject), "model-ascii.stl");
    }

    /*
		console.log("Breakpoint");
		console.log("inputObject: " + inputObject);
		console.log("input: " + input);
		*/
  },
});

/**
 * @author kovacsv / http://kovacsv.hu/
 * @author mrdoob / http://mrdoob.com/
 * @author mudcube / http://mudcu.be/
 * @author Mugen87 / https://github.com/Mugen87
 * latest ver.: https://github.com/mrdoob/three.js/blob/4bbcaacc4f41bc1b368fdd318ad432499a6506c2/examples/js/exporters/STLExporter.js
 *
 *  *
 * Usage:
 *  var exporter = new THREE.STLExporter();
 *
 *  // second argument is a list of options
 *  var data = exporter.parse( mesh, { binary: true } );
 *
 */

THREE.STLExporter = function () {};

THREE.STLExporter.prototype = {
  constructor: THREE.STLExporter,
  parse: (function () {
    return function parse(scene, options = {}) {
		const binary = options.binary !== undefined ? options.binary : false; //
      const objects = [];
      let triangles = 0;
      scene.traverse(function (object) {
        if (object.isMesh) {
          const geometry = object.geometry;
          const index = geometry.index;
          const positionAttribute = geometry.getAttribute("position");
          triangles +=
            index !== null ? index.count / 3 : positionAttribute.count / 3;
          objects.push({
            object3d: object,
            geometry: geometry,
          });
        }
      });
      let output;
      let offset = 80; // skip header

      if (binary === true) {
        const bufferLength = triangles * 2 + triangles * 3 * 4 * 4 + 80 + 4;
        const arrayBuffer = new ArrayBuffer(bufferLength);
        output = new DataView(arrayBuffer);
        output.setUint32(offset, triangles, true);
        offset += 4;
      } else {
        output = "";
        output += "solid exported\n";
      }

      const vA = new THREE.Vector3();
      const vB = new THREE.Vector3();
      const vC = new THREE.Vector3();
      const cb = new THREE.Vector3();
      const ab = new THREE.Vector3();
      const normal = new THREE.Vector3();

      for (let i = 0, il = objects.length; i < il; i++) {
        const object = objects[i].object3d;
        const geometry = objects[i].geometry;
        const index = geometry.index;
        const positionAttribute = geometry.getAttribute("position");

        if (index !== null) {
          // indexed geometry
          for (let j = 0; j < index.count; j += 3) {
            const a = index.getX(j + 0);
            const b = index.getX(j + 1);
            const c = index.getX(j + 2);
            writeFace(a, b, c, positionAttribute, object);
          }
        } else {
          // non-indexed geometry
          for (let j = 0; j < positionAttribute.count; j += 3) {
            const a = j + 0;
            const b = j + 1;
            const c = j + 2;
            writeFace(a, b, c, positionAttribute, object);
          }
        }
      }

      if (binary === false) {
        output += "endsolid exported\n";
      }

      return output;

      function writeFace(a, b, c, positionAttribute, object) {
        vA.fromBufferAttribute(positionAttribute, a);
        vB.fromBufferAttribute(positionAttribute, b);
        vC.fromBufferAttribute(positionAttribute, c);

        if (object.isSkinnedMesh === true) {
          object.boneTransform(a, vA);
          object.boneTransform(b, vB);
          object.boneTransform(c, vC);
        }

        vA.applyMatrix4(object.matrixWorld);
        vB.applyMatrix4(object.matrixWorld);
        vC.applyMatrix4(object.matrixWorld);
        writeNormal(vA, vB, vC);
        writeVertex(vA);
        writeVertex(vB);
        writeVertex(vC);

        if (binary === true) {
          output.setUint16(offset, 0, true);
          offset += 2;
        } else {
          output += "\t\tendloop\n";
          output += "\tendfacet\n";
        }
      }

      function writeNormal(vA, vB, vC) {
        cb.subVectors(vC, vB);
        ab.subVectors(vA, vB);
        cb.cross(ab).normalize();
        normal.copy(cb).normalize();

        if (binary === true) {
          output.setFloat32(offset, normal.x, true);
          offset += 4;
          output.setFloat32(offset, normal.y, true);
          offset += 4;
          output.setFloat32(offset, normal.z, true);
          offset += 4;
        } else {
          output +=
            "\tfacet normal " +
            normal.x +
            " " +
            normal.y +
            " " +
            normal.z +
            "\n";
          output += "\t\touter loop\n";
        }
      }

      function writeVertex(vertex) {
        if (binary === true) {
          output.setFloat32(offset, vertex.x, true);
          offset += 4;
          output.setFloat32(offset, vertex.y, true);
          offset += 4;
          output.setFloat32(offset, vertex.z, true);
          offset += 4;
        } else {
          output +=
            "\t\t\tvertex " + vertex.x + " " + vertex.y + " " + vertex.z + "\n";
        }
      }
    };
  })(),
};
