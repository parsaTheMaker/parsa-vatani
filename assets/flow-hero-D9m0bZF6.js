import{r as e}from"./rolldown-runtime-S-ySWqyJ.js";import{i as t,r as n}from"./framework-DjPHiq1u.js";var r=e(t(),1),i=n(),a=`/parsa-vatani/drivaerml-run1-73600.q16`,o=73600,s=35200,c=36,l=8,u=1,d=`
  in vec3 a_position_q;
  in float a_seed;

  uniform float u_time;
  uniform float u_assemble;
  uniform float u_yaw;
  uniform float u_pitch;
  uniform float u_scale;
  uniform float u_aspect;
  uniform float u_scroll;
  uniform vec3 u_position_min;
  uniform vec3 u_position_span;

  float random(float value) {
    return fract(sin(value * 91.917) * 47453.5453);
  }

  float smoother(float value) {
    value = clamp(value, 0.0, 1.0);
    return value * value * value * (value * (value * 6.0 - 15.0) + 10.0);
  }

  vec4 projectParticle() {
    vec3 authored = u_position_min + a_position_q * u_position_span;
    float seedB = random(a_seed + 0.37);
    float seedC = random(a_seed + 0.79);
    float localArrival = smoothstep(a_seed * 0.18, 0.72 + a_seed * 0.18, u_assemble);
    float arrival = mix(localArrival, smoother(localArrival), 0.72);

    float arm = floor(seedB * 4.0);
    float radius = 0.08 + pow(seedC, 0.58) * 0.82;
    float angle = radius * 10.2 + arm * 1.5707963 + a_seed * 1.4 + u_time * 0.15;
    vec3 galaxy = vec3(
      cos(angle) * radius,
      sin(angle) * radius * 0.56,
      (seedB - 0.5) * (0.72 - radius * 0.34)
    );
    vec3 point = mix(galaxy, authored, arrival);

    float layerLag = 1.0 + authored.y * 0.075;
    float yaw = (u_yaw + sin(u_time * 0.22) * 0.026) * layerLag;
    float cosineYaw = cos(yaw);
    float sineYaw = sin(yaw);
    float rotatedX = point.x * cosineYaw - point.y * sineYaw;
    float rotatedDepth = point.x * sineYaw + point.y * cosineYaw;

    float cosinePitch = cos(u_pitch);
    float sinePitch = sin(u_pitch);
    float pitchedDepth = rotatedDepth * cosinePitch - point.z * sinePitch;
    float pitchedZ = rotatedDepth * sinePitch + point.z * cosinePitch;
    float perspective = 1.0 / (1.0 + pitchedDepth * 0.68);

    vec2 ndc = vec2(rotatedX * u_scale, pitchedZ * u_scale * u_aspect) * perspective;
    ndc.y += 0.04;

    float disperse = smoothstep(0.18, 0.96, u_scroll);
    ndc.x += (authored.x + (seedB - 0.5) * 0.18) * 0.3 * disperse;
    ndc.y += sin(authored.x * 14.0 + a_seed * 20.0) * 0.055 * disperse;
    return vec4(ndc, pitchedDepth, perspective);
  }

  vec4 coastMotion(vec4 state, float mass, float age) {
    float returnRate = 6.0;
    float drag = 8.0 / sqrt(mass);
    float velocityDecay = exp(-drag * age);
    float returnDecay = exp(-returnRate * age);
    float divisor = drag - returnRate;
    divisor = abs(divisor) < 0.0001 ? 0.0001 : divisor;
    state.xy = state.xy * returnDecay
      + state.zw * (returnDecay - velocityDecay) / divisor;
    state.zw *= velocityDecay;
    return state;
  }
`,f=`#version 300 es
  precision highp float;
  precision highp sampler2D;

  ${d}

  uniform float u_pixel_ratio;
  uniform float u_pointer_active;
  uniform vec2 u_pointer;
  uniform vec2 u_pointer_previous;
  uniform vec2 u_pointer_impulse;
  uniform float u_motion_enabled;
  uniform sampler2D u_motion_texture;
  uniform int u_motion_width;
  uniform float u_motion_age;

  out float v_alpha;
  out float v_brightness;
  out float v_depth;
  out vec3 v_color;

  void main() {
    vec4 projected = projectParticle();
    vec2 ndc = projected.xy;
    float seedB = random(a_seed + 0.37);
    float seedC = random(a_seed + 0.79);
    float rareStar = pow(seedC, 10.0);
    float mediumStar = pow(seedB, 4.2);
    float mass = mix(0.68, 2.4, clamp(mediumStar + rareStar, 0.0, 1.0));

    float motionGlow = 0.0;
    if (u_motion_enabled > 0.5 && u_motion_age < ${u}.0) {
      ivec2 motionCoordinate = ivec2(gl_VertexID % u_motion_width, gl_VertexID / u_motion_width);
      vec4 motion = coastMotion(texelFetch(u_motion_texture, motionCoordinate, 0), mass, u_motion_age);
      ndc += motion.xy;
      motionGlow = clamp(length(motion.zw) * 4.0, 0.0, 1.0);
    } else if (u_pointer_active > 0.001) {
      vec2 metricScale = vec2(max(u_aspect, 0.55), 1.0);
      vec2 current = ndc * metricScale;
      vec2 start = u_pointer_previous * metricScale;
      vec2 segment = (u_pointer - u_pointer_previous) * metricScale;
      float along = clamp(dot(current - start, segment) / max(dot(segment, segment), 0.000001), 0.0, 1.0);
      vec2 delta = current - start - segment * along;
      float gaussian = exp(-dot(delta, delta) / (2.0 * 0.108 * 0.108));
      vec2 impulse = u_pointer_impulse * metricScale;
      impulse *= min(1.0, 0.18 / max(length(impulse), 0.00001));
      vec2 tangent = vec2(-impulse.y, impulse.x) * (seedB - 0.5) * 0.55;
      ndc += (impulse * 3.9 + tangent) / metricScale * gaussian / mass;
      motionGlow = gaussian;
    }

    float assemble = smoothstep(0.03, 0.76, u_assemble);
    float disperse = smoothstep(0.18, 0.96, u_scroll);
    float twinkle = 0.74 + 0.26 * sin(u_time * (1.0 + seedB * 1.7) + a_seed * 61.0);
    float depthNear = 1.0 - smoothstep(-0.34, 0.34, projected.z);
    float depthBrightness = mix(0.42, 1.18, depthNear);
    v_depth = depthNear;
    v_brightness = clamp(twinkle * depthBrightness + rareStar * 0.9 + motionGlow * 0.82, 0.18, 2.0);
    v_alpha = assemble * (1.0 - disperse * 0.58)
      * (0.28 + seedB * 0.34 + mediumStar * 0.16 + rareStar * 0.22)
      * mix(0.5, 1.0, depthNear);
    vec3 depthColor = mix(vec3(0.17, 0.43, 0.78), vec3(0.9, 0.98, 1.0), depthNear);
    v_color = mix(depthColor, vec3(1.0), clamp(rareStar * 1.8 + motionGlow * 0.72, 0.0, 1.0));

    float starSize = 1.45 + mediumStar * 3.8 + rareStar * 8.6;
    starSize *= projected.w * mix(0.68, 1.42, depthNear)
      * (0.92 + seedB * 0.2) * (1.0 + motionGlow * 0.38);
    gl_PointSize = starSize * u_pixel_ratio;
    gl_Position = vec4(ndc, clamp(projected.z * 0.08, -0.9, 0.9), 1.0);
  }
`,ee=`#version 300 es
  precision mediump float;

  in float v_alpha;
  in float v_brightness;
  in float v_depth;
  in vec3 v_color;
  out vec4 outputColor;

  void main() {
    vec2 centered = gl_PointCoord * 2.0 - 1.0;
    float radiusSquared = dot(centered, centered);
    if (radiusSquared > 1.0) discard;
    float core = exp(-radiusSquared * mix(10.0, 5.8, v_depth));
    float halo = pow(max(0.0, 1.0 - radiusSquared), 2.4);
    float alpha = (core * 0.84 + halo * mix(0.12, 0.3, v_depth)) * v_alpha;
    outputColor = vec4(v_color * (0.68 + v_brightness * 0.52), alpha);
  }
`,te=`#version 300 es
  precision highp float;
  precision highp sampler2D;

  ${d}

  uniform sampler2D u_motion_texture;
  uniform int u_motion_width;
  uniform int u_motion_height;
  uniform float u_motion_age;
  uniform vec2 u_pointer;
  uniform vec2 u_pointer_previous;
  uniform vec2 u_pointer_impulse;

  out vec4 v_motion_state;

  void main() {
    ivec2 motionCoordinate = ivec2(gl_VertexID % u_motion_width, gl_VertexID / u_motion_width);
    float seedB = random(a_seed + 0.37);
    float seedC = random(a_seed + 0.79);
    float mass = mix(0.68, 2.4, clamp(pow(seedB, 4.2) + pow(seedC, 10.0), 0.0, 1.0));
    vec4 state = coastMotion(texelFetch(u_motion_texture, motionCoordinate, 0), mass, u_motion_age);

    vec2 metricScale = vec2(max(u_aspect, 0.55), 1.0);
    vec2 current = (projectParticle().xy + state.xy) * metricScale;
    vec2 start = u_pointer_previous * metricScale;
    vec2 segment = (u_pointer - u_pointer_previous) * metricScale;
    float along = clamp(dot(current - start, segment) / max(dot(segment, segment), 0.000001), 0.0, 1.0);
    vec2 delta = current - start - segment * along;
    float gaussian = exp(-dot(delta, delta) / (2.0 * 0.108 * 0.108));

    vec2 impulse = u_pointer_impulse * metricScale;
    impulse *= min(1.0, 0.18 / max(length(impulse), 0.00001));
    vec2 curl = vec2(-impulse.y, impulse.x) * (seedB - 0.5) * 0.55;
    state.zw += (impulse * 5.4 + curl) / metricScale * gaussian / mass;
    float speed = length(state.zw * metricScale);
    state.zw *= min(1.0, 0.5 / max(speed, 0.00001));
    v_motion_state = state;

    vec2 texturePosition = (vec2(motionCoordinate) + 0.5) / vec2(u_motion_width, u_motion_height);
    gl_Position = vec4(texturePosition * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = 1.0;
  }
`,ne=`#version 300 es
  precision highp float;
  in vec4 v_motion_state;
  out vec4 outputState;
  void main() {
    outputState = v_motion_state;
  }
`;function p(e,t=0,n=1){return Math.max(t,Math.min(n,e))}function re(e){if(e.byteLength<c)throw Error(`Invalid DrivAerML point-cloud asset`);let t=new DataView(e),n=String.fromCharCode(t.getUint8(0),t.getUint8(1),t.getUint8(2),t.getUint8(3)),r=t.getUint16(4,!0),i=t.getUint16(6,!0),a=t.getUint32(8,!0),s=c+a*i;if(n!==`DVPC`||r!==1||i!==l||a<o||e.byteLength!==s)throw Error(`Unsupported DrivAerML point-cloud asset`);return{payload:new Uint8Array(e,c),count:a,positionMin:[t.getFloat32(12,!0),t.getFloat32(16,!0),t.getFloat32(20,!0)],positionSpan:[t.getFloat32(24,!0),t.getFloat32(28,!0),t.getFloat32(32,!0)]}}function m(e,t,n){let r=e.createShader(t);if(!r)throw Error(`Unable to create WebGL shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)||`Unknown shader compilation error`;throw e.deleteShader(r),Error(t)}return r}function h(e,t,n){let r=m(e,e.VERTEX_SHADER,t),i=m(e,e.FRAGMENT_SHADER,n),a=e.createProgram();if(!a)throw Error(`Unable to create WebGL program`);if(e.attachShader(a,r),e.attachShader(a,i),e.bindAttribLocation(a,0,`a_position_q`),e.bindAttribLocation(a,1,`a_seed`),e.linkProgram(a),e.deleteShader(r),e.deleteShader(i),!e.getProgramParameter(a,e.LINK_STATUS)){let t=e.getProgramInfoLog(a)||`Unknown WebGL link error`;throw e.deleteProgram(a),Error(t)}return a}function g(e,t){return{time:e.getUniformLocation(t,`u_time`),assemble:e.getUniformLocation(t,`u_assemble`),yaw:e.getUniformLocation(t,`u_yaw`),pitch:e.getUniformLocation(t,`u_pitch`),scale:e.getUniformLocation(t,`u_scale`),aspect:e.getUniformLocation(t,`u_aspect`),scroll:e.getUniformLocation(t,`u_scroll`),positionMin:e.getUniformLocation(t,`u_position_min`),positionSpan:e.getUniformLocation(t,`u_position_span`)}}function _(e,t){if(!e.getExtension(`EXT_color_buffer_float`)||e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS)<1)return null;let n=Math.ceil(t/256);function r(){let t=e.createTexture();if(!t)throw Error(`Unable to create motion texture`);return e.bindTexture(e.TEXTURE_2D,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,256,n,0,e.RGBA,e.HALF_FLOAT,null),t}function i(t){let n=e.createFramebuffer();if(!n)throw Error(`Unable to create motion framebuffer`);if(e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0),e.checkFramebufferStatus(e.FRAMEBUFFER)!==e.FRAMEBUFFER_COMPLETE)throw e.deleteFramebuffer(n),Error(`Half-float motion framebuffer is unavailable`);return e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),n}let a=null,o=null,s=null,c=null;try{return a=r(),o=r(),s=i(a),c=i(o),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),{width:256,height:n,frontTexture:a,backTexture:o,frontFramebuffer:s,backFramebuffer:c,updatedAt:performance.now()-u*1e3}}catch{return s&&e.deleteFramebuffer(s),c&&e.deleteFramebuffer(c),a&&e.deleteTexture(a),o&&e.deleteTexture(o),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),null}}function v(e,t){t&&(e.deleteFramebuffer(t.frontFramebuffer),e.deleteFramebuffer(t.backFramebuffer),e.deleteTexture(t.frontTexture),e.deleteTexture(t.backTexture))}function y(){let e=(0,r.useRef)(null),t=(0,r.useRef)({left:0,top:0,width:1,height:1}),n=(0,r.useRef)(0),c=(0,r.useRef)(!1),[d,m]=(0,r.useState)(0),y=(0,r.useRef)({pointerX:0,pointerY:0,motionFromX:0,motionFromY:0,pointerActive:0,targetPointerActive:0,impulseX:0,impulseY:0,impulsePending:!1,yaw:0,pitch:0,targetYaw:0,targetPitch:0,yawVelocity:0,pitchVelocity:0,idleYaw:0,dragging:!1,lastClientX:0,lastClientY:0,lastEventTime:0});(0,r.useEffect)(()=>{let r=e.current;if(!r)return;r.classList.remove(`webgl-fallback`);let i=e=>{e.preventDefault(),r.classList.add(`webgl-fallback`)},d=()=>m(e=>e+1);r.addEventListener(`webglcontextlost`,i),r.addEventListener(`webglcontextrestored`,d);let b=r.getContext(`webgl2`,{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:`high-performance`});if(!b)return r.classList.add(`webgl-fallback`),()=>{r.removeEventListener(`webglcontextlost`,i),r.removeEventListener(`webglcontextrestored`,d)};let x,S;try{x=h(b,f,ee),S=h(b,te,ne)}catch(e){return console.error(`Unable to initialize the DrivAer star renderer`,e),r.classList.add(`webgl-fallback`),()=>{r.removeEventListener(`webglcontextlost`,i),r.removeEventListener(`webglcontextrestored`,d)}}let C=b.createBuffer(),w=b.createVertexArray();if(!C||!w)return r.classList.add(`webgl-fallback`),C&&b.deleteBuffer(C),w&&b.deleteVertexArray(w),b.deleteProgram(x),b.deleteProgram(S),()=>{r.removeEventListener(`webglcontextlost`,i),r.removeEventListener(`webglcontextrestored`,d)};let T={...g(b,x),pixelRatio:b.getUniformLocation(x,`u_pixel_ratio`),pointerActive:b.getUniformLocation(x,`u_pointer_active`),pointer:b.getUniformLocation(x,`u_pointer`),pointerPrevious:b.getUniformLocation(x,`u_pointer_previous`),pointerImpulse:b.getUniformLocation(x,`u_pointer_impulse`),motionEnabled:b.getUniformLocation(x,`u_motion_enabled`),motionTexture:b.getUniformLocation(x,`u_motion_texture`),motionWidth:b.getUniformLocation(x,`u_motion_width`),motionAge:b.getUniformLocation(x,`u_motion_age`)},E={...g(b,S),motionTexture:b.getUniformLocation(S,`u_motion_texture`),motionWidth:b.getUniformLocation(S,`u_motion_width`),motionHeight:b.getUniformLocation(S,`u_motion_height`),motionAge:b.getUniformLocation(S,`u_motion_age`),pointer:b.getUniformLocation(S,`u_pointer`),pointerPrevious:b.getUniformLocation(S,`u_pointer_previous`),pointerImpulse:b.getUniformLocation(S,`u_pointer_impulse`)};b.bindVertexArray(w),b.bindBuffer(b.ARRAY_BUFFER,C),b.enableVertexAttribArray(0),b.vertexAttribPointer(0,3,b.UNSIGNED_SHORT,!0,l,0),b.enableVertexAttribArray(1),b.vertexAttribPointer(1,1,b.UNSIGNED_SHORT,!0,l,6),b.bindVertexArray(null),b.disable(b.DEPTH_TEST),b.clearColor(0,0,0,0);let D=window.matchMedia(`(prefers-reduced-motion: reduce)`),O=new AbortController,ie=r.closest(`.flow-hero`),k=null,A=0,j=1,M=1,N=1,P=0,F=0,I=0,L=0,R=D.matches,z=!0,B=performance.now(),V=null;function H(e,t){k&&(b.useProgram(e),b.uniform3f(t.positionMin,...k.positionMin),b.uniform3f(t.positionSpan,...k.positionSpan))}function ae(){k&&(b.bindBuffer(b.ARRAY_BUFFER,C),b.bufferData(b.ARRAY_BUFFER,k.payload,b.STATIC_DRAW),H(x,T),H(S,E))}function oe(){V&&(b.disable(b.BLEND),b.clearColor(0,0,0,0),b.bindFramebuffer(b.FRAMEBUFFER,V.frontFramebuffer),b.clear(b.COLOR_BUFFER_BIT),b.bindFramebuffer(b.FRAMEBUFFER,V.backFramebuffer),b.clear(b.COLOR_BUFFER_BIT),b.bindFramebuffer(b.FRAMEBUFFER,null),V.updatedAt=performance.now()-u*1e3)}function U(){let e=Math.min(k?.count??0,j<720?s:o);A!==e&&(A=e,v(b,V),V=A&&!R?_(b,A):null)}function W(){I=0;let e=ie?.getBoundingClientRect(),t=e?Math.max(1,e.height-window.innerHeight):1;P=e?p(-e.top/t):0,R&&J(0)}function G(){I||=requestAnimationFrame(W)}function K(){let e=r.getBoundingClientRect();t.current={left:e.left,top:e.top,width:Math.max(1,e.width),height:Math.max(1,e.height)},j=t.current.width,M=t.current.height;let n=j<720?1.6:1.8,i=Math.max(.75,Math.sqrt(32e5/(j*M)));N=Math.floor(Math.min(window.devicePixelRatio||1,n,i)*100)/100;let a=Math.max(1,Math.round(j*N)),o=Math.max(1,Math.round(M*N));(r.width!==a||r.height!==o)&&(r.width=a,r.height=o),U(),W(),J(R?0:performance.now())}function q(e,t,n,r,i,a){b.uniform1f(e.time,R?0:t/1e3),b.uniform1f(e.assemble,n),b.uniform1f(e.yaw,r),b.uniform1f(e.pitch,i),b.uniform1f(e.scale,a),b.uniform1f(e.aspect,j/M),b.uniform1f(e.scroll,P)}function se(e,t,n,r,i){let a=y.current;if(!V||!a.impulsePending||a.dragging||R)return;let o=p((e-V.updatedAt)/1e3,0,u);b.bindFramebuffer(b.FRAMEBUFFER,V.backFramebuffer),b.viewport(0,0,V.width,V.height),b.disable(b.BLEND),b.useProgram(S),b.bindVertexArray(w),q(E,e,t,n,r,i),b.activeTexture(b.TEXTURE0),b.bindTexture(b.TEXTURE_2D,V.frontTexture),b.uniform1i(E.motionTexture,0),b.uniform1i(E.motionWidth,V.width),b.uniform1i(E.motionHeight,V.height),b.uniform1f(E.motionAge,o),b.uniform2f(E.pointer,a.pointerX,a.pointerY),b.uniform2f(E.pointerPrevious,a.motionFromX,a.motionFromY),b.uniform2f(E.pointerImpulse,a.impulseX,a.impulseY),b.drawArrays(b.POINTS,0,A);let s=V.frontTexture,c=V.frontFramebuffer;V.frontTexture=V.backTexture,V.frontFramebuffer=V.backFramebuffer,V.backTexture=s,V.backFramebuffer=c,V.updatedAt=e,a.motionFromX=a.pointerX,a.motionFromY=a.pointerY,a.impulseX=0,a.impulseY=0,a.impulsePending=!1}function J(e){let t=y.current,i=L?p((e-L)/1e3,0,.05):1/60;if(L=e,t.pointerActive+=(t.targetPointerActive-t.pointerActive)*(1-Math.exp(-10*i)),!t.dragging){t.targetYaw+=t.yawVelocity*i,t.targetPitch=p(t.targetPitch+t.pitchVelocity*i,-.36,.3);let e=Math.exp(-4.4*i);t.yawVelocity*=e,t.pitchVelocity*=e}let a=1-Math.exp(-12*i);if(t.yaw+=(t.targetYaw-t.yaw)*a,t.pitch+=(t.targetPitch-t.pitch)*a,!R&&!t.dragging&&(t.idleYaw+=i*.025),n.current>B&&(B=n.current,c.current=!0),c.current&&=(oe(),!1),b.bindFramebuffer(b.FRAMEBUFFER,null),b.viewport(0,0,r.width,r.height),b.clearColor(0,0,0,0),b.clear(b.COLOR_BUFFER_BIT),!A)return;let o=R?6:Math.max(0,(e-B)/1e3),s=R?1:p((o-.05)/2.75),l=-.22+t.yaw+t.idleYaw+P*.16,d=.07+t.pitch-P*.025,f=(j<720?1.78:1.18)*(1+P*.06);if(se(e,s,l,d,f),b.bindFramebuffer(b.FRAMEBUFFER,null),b.viewport(0,0,r.width,r.height),b.enable(b.BLEND),b.blendFunc(b.SRC_ALPHA,b.ONE),b.useProgram(x),b.bindVertexArray(w),q(T,e,s,l,d,f),b.uniform1f(T.pixelRatio,N),b.uniform1f(T.pointerActive,t.pointerActive),b.uniform2f(T.pointer,t.pointerX,t.pointerY),b.uniform2f(T.pointerPrevious,t.motionFromX,t.motionFromY),b.uniform2f(T.pointerImpulse,t.impulseX,t.impulseY),b.uniform1f(T.motionEnabled,+!!V),b.uniform1i(T.motionWidth,V?.width??1),b.uniform1f(T.motionAge,V?p((e-V.updatedAt)/1e3,0,u):u),b.activeTexture(b.TEXTURE0),b.bindTexture(b.TEXTURE_2D,V?.frontTexture??null),b.uniform1i(T.motionTexture,0),b.drawArrays(b.POINTS,0,A),!V){t.impulsePending&&=(t.motionFromX=t.pointerX,t.motionFromY=t.pointerY,!1);let e=Math.exp(-7*i);t.impulseX*=e,t.impulseY*=e}}function Y(e){if(document.hidden||R||!z){F=0,L=0;return}J(e),F=requestAnimationFrame(Y)}function X(){!document.hidden&&!R&&z&&!F&&(F=requestAnimationFrame(Y))}function Z(){document.hidden?(F&&cancelAnimationFrame(F),F=0,L=0):X()}function Q(){n.current=performance.now(),c.current=!0,r.focus(),X()}function $(){R=D.matches,F&&cancelAnimationFrame(F),F=0,L=0,v(b,V),V=A&&!R?_(b,A):null,R?J(0):X()}let ce=new ResizeObserver(K),le=new IntersectionObserver(([e])=>{z=e.isIntersecting,!z&&F?(cancelAnimationFrame(F),F=0,L=0):X()},{rootMargin:`10% 0px`});return ce.observe(r),le.observe(r),document.addEventListener(`visibilitychange`,Z),window.addEventListener(`scroll`,G,{passive:!0}),window.addEventListener(`drivaer:replay`,Q),D.addEventListener(`change`,$),W(),K(),$(),fetch(a,{cache:`force-cache`,signal:O.signal}).then(e=>{if(!e.ok)throw Error(`Point cloud request failed: ${e.status}`);return e.arrayBuffer()}).then(e=>{k=re(e),ae(),B=performance.now(),U(),J(R?0:B)}).catch(e=>{e instanceof DOMException&&e.name===`AbortError`||(console.error(`Unable to load the DrivAerML geometry`,e),r.classList.add(`webgl-fallback`))}),()=>{O.abort(),ce.disconnect(),le.disconnect(),document.removeEventListener(`visibilitychange`,Z),window.removeEventListener(`scroll`,G),window.removeEventListener(`drivaer:replay`,Q),D.removeEventListener(`change`,$),r.removeEventListener(`webglcontextlost`,i),r.removeEventListener(`webglcontextrestored`,d),F&&cancelAnimationFrame(F),I&&cancelAnimationFrame(I),v(b,V),b.deleteVertexArray(w),b.deleteBuffer(C),b.deleteProgram(x),b.deleteProgram(S)}},[d]);function b(e){let n=t.current;return{x:((e.clientX-n.left)/n.width-.5)*2,y:(.5-(e.clientY-n.top)/n.height)*2}}function x(e){let t=y.current,n=b(e);if(t.dragging){let n=Math.max(8,e.timeStamp-t.lastEventTime)/1e3,r=(e.clientX-t.lastClientX)*.005,i=(e.clientY-t.lastClientY)*.0045;t.targetYaw+=r,t.targetPitch=p(t.targetPitch+i,-.36,.3),t.yawVelocity=p(r/n,-4.5,4.5),t.pitchVelocity=p(i/n,-3.2,3.2),t.lastClientX=e.clientX,t.lastClientY=e.clientY,t.lastEventTime=e.timeStamp}else t.targetPointerActive>0&&(t.pointerX=n.x,t.pointerY=n.y,t.impulseX=p(n.x-t.motionFromX,-.18,.18),t.impulseY=p(n.y-t.motionFromY,-.18,.18),t.impulsePending=t.impulseX*t.impulseX+t.impulseY*t.impulseY>1e-6);t.targetPointerActive=1}function S(e){if(!e.isPrimary||e.button!==0)return;let t=y.current,n=b(e);t.pointerX=n.x,t.pointerY=n.y,t.motionFromX=n.x,t.motionFromY=n.y,t.impulseX=0,t.impulseY=0,t.impulsePending=!1,t.dragging=!0,t.lastClientX=e.clientX,t.lastClientY=e.clientY,t.lastEventTime=e.timeStamp,t.yawVelocity=0,t.pitchVelocity=0,t.targetPointerActive=1,e.pointerType!==`touch`&&e.currentTarget.setPointerCapture(e.pointerId)}function C(e){let t=y.current;t.dragging=!1,e.pointerType!==`mouse`&&(t.targetPointerActive=0),e.currentTarget.hasPointerCapture(e.pointerId)&&e.currentTarget.releasePointerCapture(e.pointerId)}function w(){let e=y.current;e.dragging=!1,e.targetPointerActive=0,e.impulsePending=!1}function T(e){if(e.pointerType===`touch`)return;let t=b(e),n=y.current;n.pointerX=t.x,n.pointerY=t.y,n.motionFromX=t.x,n.motionFromY=t.y,n.impulseX=0,n.impulseY=0,n.impulsePending=!1,n.targetPointerActive=1}function E(e){let t=y.current,n=.08;if(e.key===`ArrowLeft`)t.targetYaw-=n;else if(e.key===`ArrowRight`)t.targetYaw+=n;else if(e.key===`ArrowUp`)t.targetPitch=p(t.targetPitch-n,-.36,.3);else if(e.key===`ArrowDown`)t.targetPitch=p(t.targetPitch+n,-.36,.3);else return;t.yawVelocity=0,t.pitchVelocity=0,e.preventDefault()}return(0,i.jsx)(`canvas`,{ref:e,className:`drivaer-canvas`,role:`application`,tabIndex:0,"aria-label":`Interactive galaxy of stars forming the DrivAerML Run 1 vehicle. Move the pointer to sweep nearby stars; drag or use arrow keys to rotate it.`,onPointerEnter:T,onPointerMove:x,onPointerDown:S,onPointerUp:C,onPointerCancel:C,onPointerLeave:w,onLostPointerCapture:w,onKeyDown:E})}function b(){let e=(0,r.useRef)(null);(0,r.useEffect)(()=>{let t=e.current;if(!t)return;let n=0,r=()=>{n=0;let e=t.getBoundingClientRect(),r=Math.max(1,e.height-window.innerHeight),i=Math.max(0,Math.min(1,-e.top/r));t.style.setProperty(`--hero-progress`,i.toFixed(3))},i=()=>{n||=requestAnimationFrame(r)};return r(),window.addEventListener(`scroll`,i,{passive:!0}),window.addEventListener(`resize`,i,{passive:!0}),()=>{n&&cancelAnimationFrame(n),window.removeEventListener(`scroll`,i),window.removeEventListener(`resize`,i)}},[]);function t(){window.dispatchEvent(new Event(`drivaer:replay`))}return(0,i.jsx)(`section`,{ref:e,className:`flow-hero`,"aria-labelledby":`hero-heading`,children:(0,i.jsxs)(`div`,{className:`hero-stage`,children:[(0,i.jsx)(`div`,{className:`hero-field`,children:(0,i.jsx)(y,{})}),(0,i.jsx)(`div`,{className:`hero-name hero-name-left`,"aria-hidden":`true`,children:`Parsa`}),(0,i.jsx)(`div`,{className:`hero-name hero-name-right`,"aria-hidden":`true`,children:`Vatani`}),(0,i.jsxs)(`div`,{className:`hero-statement`,children:[(0,i.jsx)(`p`,{children:`CFD / AI Engineer · Researcher · Lecturer`}),(0,i.jsx)(`h1`,{id:`hero-heading`,children:`Engineering intelligence for the physical world.`})]}),(0,i.jsx)(`div`,{className:`hero-meta hero-meta-left`,children:`Vehicle aerodynamics · Scientific ML`}),(0,i.jsx)(`div`,{className:`hero-meta hero-meta-right`,children:`Move to disturb · Drag to rotate`}),(0,i.jsx)(`button`,{type:`button`,className:`drivaer-replay`,"aria-label":`Replay DrivAer star-field animation`,onClick:t,children:(0,i.jsx)(`svg`,{viewBox:`0 0 20 20`,"aria-hidden":`true`,children:(0,i.jsx)(`path`,{d:`M10 2.15a7.85 7.85 0 1 1-7.6 9.72 1 1 0 0 1 1.95-.46A5.85 5.85 0 1 0 5.2 6.7h1.35a1 1 0 0 1 0 2H2.9a1 1 0 0 1-1-1V3.8a1 1 0 0 1 2 0v1.02A7.82 7.82 0 0 1 10 2.15Z`})})}),(0,i.jsx)(`span`,{className:`hero-scroll-line`,"aria-hidden":`true`})]})})}export{b as FlowHero};