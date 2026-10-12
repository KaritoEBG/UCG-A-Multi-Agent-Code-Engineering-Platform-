import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// --- ADVANCED GLSL SHADER DEFINITIONS ---

const glslNoise = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; 
  vec3 x3 = x0 - D.yyy;      
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857; 
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}
`;

const vertexShader = `
  ${glslNoise}

  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vTurbulence;

  void main() {
    vUv = uv;
    vNormal = normal;

    vec3 warp = vec3(
      snoise(position * 1.5 + uTime * 0.15),
      snoise(position * 1.6 - uTime * 0.12 + 10.0),
      snoise(position * 1.4 + uTime * 0.18 + 20.0)
    );
    vec3 warpedPos = position + warp * 0.6;

    float t1 = snoise(warpedPos * 2.0 - uTime * 0.2);
    float t2 = snoise(warpedPos * 4.0 + uTime * 0.3) * 0.5;
    float t3 = abs(snoise(warpedPos * 8.0 - uTime * 0.4)) * 0.1; 

    float turbulence = t1 + t2 - t3;
    vTurbulence = turbulence;

    float displacement = turbulence * 0.35;
    float breath = sin(uTime * 0.5) * 0.04; 
    
    vec3 finalPos = position + normal * (displacement + breath);
    
    vPosition = finalPos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  }
`;

const fragmentShader = `
  ${glslNoise}

  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vTurbulence;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float baseFresnel = max(0.0, dot(viewDir, normalize(vNormal)));

    float crackIntensity = smoothstep(0.2, -0.5, vTurbulence); 
    float erraticPulse = snoise(vec3(uTime * 2.0, vPosition.x, vPosition.y)) * 0.5 + 0.5;
    float violentSurge = pow(erraticPulse, 3.0) * 0.9;
    
    float coreGlow = pow(baseFresnel, 4.0) * 0.35;
    float leakedGlow = crackIntensity * (0.15 + violentSurge * 0.5);
    float totalEnergy = coreGlow + leakedGlow;

    vec3 darkMatter = vec3(0.005, 0.008, 0.025); 
    vec3 deepPlasma = vec3(0.1, 0.2, 0.8);
    vec3 cyanGlow = vec3(0.2, 0.7, 1.0);
    vec3 whiteHot = vec3(0.8, 0.95, 1.0);

    vec3 finalColor = mix(darkMatter, deepPlasma, smoothstep(0.05, 0.3, totalEnergy));
    finalColor = mix(finalColor, cyanGlow, smoothstep(0.3, 0.8, totalEnergy));
    finalColor = mix(finalColor, whiteHot, smoothstep(0.8, 1.5, totalEnergy));

    float smokeEdgeNoise = snoise(vPosition * 3.0 - uTime * 0.3);
    float alphaEdge = smoothstep(-0.3, 0.6, baseFresnel + smokeEdgeNoise * 0.4);
    
    float alpha = max(alphaEdge, clamp(totalEnergy * 1.5, 0.0, 1.0));

    gl_FragColor = vec4(finalColor, alpha * 0.95);
  }
`;

// --- GOD PARTICLE CANVAS COMPONENT ---

const GodParticleOrb = ({ size = 320 }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.z = 4.8; 

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); 
    mount.appendChild(renderer.domElement);

    // The Core Anomaly
    const geometry = new THREE.IcosahedronGeometry(1.0, 48); 
    const uniforms = { uTime: { value: 0 } };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, 
    });

    const orb = new THREE.Mesh(geometry, material);
    scene.add(orb);

    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      uniforms.uTime.value = elapsedTime;

      orb.rotation.y += 0.0015;
      orb.rotation.x -= 0.0008;
      orb.rotation.z += 0.001;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (mount && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return (
    <div className="god-particle-wrapper">
      {/* Ambient glow layers */}
      <div className="god-particle-glow-outer" />
      <div className="god-particle-glow-inner" />
      {/* WebGL canvas mount */}
      <div 
        ref={mountRef} 
        className="god-particle-canvas"
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default GodParticleOrb;
