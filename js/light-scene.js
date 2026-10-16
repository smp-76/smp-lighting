/* Abstract architecture, not a product model or a photometric calculation.
   There is deliberately no time/oscillation uniform: only inertial input. */
export function startLightScene(stage) {
  const canvas = stage.querySelector("canvas");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (!canvas || reduced.matches || navigator.connection?.saveData) return;
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
  });
  if (!gl) return;
  const vertex =
    "attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}";
  const fragment = `precision highp float;
    uniform vec2 resolution;
    uniform vec2 pointer;
    uniform float progress;
    mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
    void boxHit(vec3 ro,vec3 rd,vec3 c,vec3 h,float a,vec3 material,inout float nearest,inout vec3 normal,inout vec3 base){
      vec3 o=ro-c,d=rd;o.xz=rot(a)*o.xz;d.xz=rot(a)*d.xz;
      vec3 inv=1./(d+vec3(.000001));vec3 t0=(-h-o)*inv,t1=(h-o)*inv;
      vec3 nearT=min(t0,t1),farT=max(t0,t1);
      float t=max(max(nearT.x,nearT.y),nearT.z);float end=min(min(farT.x,farT.y),farT.z);
      if(t>.002&&t<end&&t<nearest){
        vec3 n=vec3(0.);if(nearT.x>=nearT.y&&nearT.x>=nearT.z)n.x=-sign(d.x);else if(nearT.y>=nearT.z)n.y=-sign(d.y);else n.z=-sign(d.z);
        n.xz=rot(-a)*n.xz;nearest=t;normal=n;base=material;
      }
    }
    float scene(vec3 ro,vec3 rd,out vec3 normal,out vec3 base){
      float nearest=80.;normal=vec3(0.,1.,0.);base=vec3(.12,.20,.34);
      if(rd.y<-.0001){float t=(-1.4-ro.y)/rd.y;if(t>.002){nearest=t;normal=vec3(0.,1.,0.);base=vec3(.25,.34,.49);}}
      boxHit(ro,rd,vec3(-1.9,1.4,4.7),vec3(2.,2.8,.3),-.28,vec3(.59,.68,.82),nearest,normal,base);
      boxHit(ro,rd,vec3(3.4,1.1,6.4),vec3(1.6,2.5,.3),.42,vec3(.22,.35,.59),nearest,normal,base);
      boxHit(ro,rd,vec3(.1,-.25,2.2),vec3(.18,1.15,.95),-.35,vec3(.61,.71,.86),nearest,normal,base);
      boxHit(ro,rd,vec3(-.8,-1.1,1.6),vec3(1.3,.3,1.25),.25,vec3(.33,.44,.61),nearest,normal,base);
      vec2 o=ro.xz-vec2(1.15,4.1);float aa=dot(rd.xz,rd.xz),bb=dot(o,rd.xz),cc=dot(o,o)-.62*.62;
      float disc=bb*bb-aa*cc;
      if(disc>0.){float t=(-bb-sqrt(disc))/aa;float y=ro.y+t*rd.y;
        if(t>.002&&t<nearest&&y> -1.4&&y<3.6){nearest=t;vec3 p=ro+rd*t;normal=normalize(vec3(p.x-1.15,0.,p.z-4.1));base=vec3(.58,.69,.84);}}
      if(abs(rd.y)>.0001){float t=(3.6-ro.y)/rd.y;vec2 p=ro.xz+rd.xz*t-vec2(1.15,4.1);
        if(t>.002&&t<nearest&&dot(p,p)<.62*.62){nearest=t;normal=vec3(0.,1.,0.);base=vec3(.58,.69,.84);}}
      return nearest;
    }
    float distanceBox(vec3 p,vec3 c,vec3 h,float a){p-=c;p.xz=rot(a)*p.xz;vec3 q=abs(p)-h;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
    float solidDistance(vec3 p){
      float d=distanceBox(p,vec3(-1.9,1.4,4.7),vec3(2.,2.8,.3),-.28);
      d=min(d,distanceBox(p,vec3(3.4,1.1,6.4),vec3(1.6,2.5,.3),.42));
      d=min(d,distanceBox(p,vec3(.1,-.25,2.2),vec3(.18,1.15,.95),-.35));
      d=min(d,distanceBox(p,vec3(-.8,-1.1,1.6),vec3(1.3,.3,1.25),.25));
      vec2 cylinder=vec2(length(p.xz-vec2(1.15,4.1))-.62,abs(p.y-1.1)-2.5);
      d=min(d,min(max(cylinder.x,cylinder.y),0.)+length(max(cylinder,0.)));
      return d;
    }
    float softShadow(vec3 p,vec3 light){
      vec3 direction=normalize(light-p);float end=length(light-p),t=.04,result=1.;
      for(int i=0;i<24;i++){float h=solidDistance(p+direction*t);result=min(result,9.*h/t);t+=clamp(h,.035,.65);if(t>end||result<.015)break;}
      return .18+.82*clamp(result,0.,1.);
    }
    float cone(vec3 p,vec3 light,vec3 axis){return smoothstep(.70,.96,dot(normalize(p-light),axis));}
    void main(){
      vec2 uv=gl_FragCoord.xy/resolution*2.-1.;uv.x*=resolution.x/resolution.y;
      vec3 ro=mix(vec3(4.8,2.6,-6.4),vec3(3.8,2.4,-5.3),progress);
      ro.x+=pointer.x*.12;ro.y+=pointer.y*.07;
      vec3 target=vec3(.3,1.15,3.5);vec3 forward=normalize(target-ro),right=normalize(cross(vec3(0.,1.,0.),forward)),up=cross(forward,right);
      vec3 rd=normalize(forward*2.8+right*uv.x+up*uv.y);
      vec3 normal,base;float distance=scene(ro,rd,normal,base);vec3 p=ro+rd*distance;
      vec3 light=vec3(-3.0+pointer.x*.85,6.8+pointer.y*.35,.4);
      vec3 axis=normalize(vec3(.5+pointer.x*.4,-1.4,4.3)-light);
      vec3 delta=light-p;float lighting=cone(p,light,axis);
      float diffuse=max(0.,dot(normal,normalize(delta)));
      float visibility=softShadow(p+normal*.025,light);
      vec3 color=base*(.11+max(0.,normal.y)*.13);
      color+=base*vec3(1.05,1.18,1.40)*diffuse*lighting*visibility*4.2/(1.+dot(delta,delta)*.018);
      color+=base*vec3(.05,.15,.40)*(.5+.5*normal.x);
      if(distance>70.)color=vec3(.027,.055,.105);
      float travel=min(distance,19.);float scatter=0.;
      for(int i=0;i<10;i++){
        float t=travel*(float(i)+.5)/10.;vec3 sampleP=ro+rd*t;
        vec3 v=sampleP-light;scatter+=cone(sampleP,light,axis)*exp(-t*.09)/(1.+dot(v,v)*.05);
      }
      color+=vec3(.38,.54,.85)*scatter*travel*.0009;
      color=mix(color,vec3(.026,.048,.088),1.-exp(-distance*.012));
      color=vec3(1.)-exp(-color*1.10);
      color=pow(max(color,vec3(0.)),vec3(.4545));
      gl_FragColor=vec4(color,1.);
    }`;
  function shader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error("Architecture scene unavailable");
    }
    return shader;
  }
  let program;
  try {
    program = gl.createProgram();
    const vs = shader(gl.VERTEX_SHADER, vertex),
      fs = shader(gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  } catch {
    return;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const location = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  const uniforms = {
    resolution: gl.getUniformLocation(program, "resolution"),
    pointer: gl.getUniformLocation(program, "pointer"),
    progress: gl.getUniformLocation(program, "progress"),
  };
  const hero = stage.closest("section");
  let visible = false,
    lost = false,
    frame = 0,
    previous = 0,
    x = 0,
    y = 0,
    z = 0,
    targetX = 0,
    targetY = 0,
    targetZ = 0;
  function schedule() {
    if (!frame && visible && !lost && !document.hidden && !reduced.matches)
      frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (!visible || lost || document.hidden || reduced.matches) return;
    // IntersectionObserver arrives asynchronously after a native scroll.
    const bounds = stage.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= innerHeight) return;
    const dt = previous ? Math.min(0.08, (now - previous) / 1000) : 0.016;
    previous = now;
    const inertia = 1 - Math.exp(-dt / 0.38),
      camera = 1 - Math.exp(-dt / 0.55);
    x += (targetX - x) * inertia;
    y += (targetY - y) * inertia;
    z += (targetZ - z) * camera;
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.pointer, x, y);
    gl.uniform1f(uniforms.progress, z);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    stage.classList.add("is-ready");
    if (
      Math.abs(x - targetX) + Math.abs(y - targetY) + Math.abs(z - targetZ) >
      0.001
    )
      schedule();
  }
  function resize() {
    const scale = Math.min(
      (devicePixelRatio || 1) * 1.25,
      1800 / Math.max(1, stage.clientWidth),
      1125 / Math.max(1, stage.clientHeight),
    );
    canvas.width = Math.max(1, Math.round(stage.clientWidth * scale));
    canvas.height = Math.max(1, Math.round(stage.clientHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    schedule();
  }
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    previous = 0;
    if (visible) {
      targetZ = Math.max(
        0,
        Math.min(1, -hero.getBoundingClientRect().top / hero.clientHeight),
      );
      schedule();
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(stage);
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      const r = hero.getBoundingClientRect();
      targetX = ((event.clientX - r.left) / r.width) * 2 - 1;
      targetY = 1 - ((event.clientY - r.top) / r.height) * 2;
      schedule();
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    targetX = targetY = 0;
    schedule();
  });
  addEventListener(
    "scroll",
    () => {
      if (!visible) return;
      targetZ = Math.max(
        0,
        Math.min(1, -hero.getBoundingClientRect().top / hero.clientHeight),
      );
      schedule();
    },
    { passive: true },
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      previous = 0;
      schedule();
    }
  });
  reduced.addEventListener("change", () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (reduced.matches) stage.classList.remove("is-ready");
    else schedule();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    stage.classList.remove("is-ready");
  });
  resize();
}
