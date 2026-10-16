/* Analytic architectural light study. No models, textures or external libraries. */
export function startLightScene(stage) {
  const canvas = stage.querySelector("canvas");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (!canvas || reduced.matches) return;
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
  });
  if (!gl) return;
  const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision mediump float;
    uniform vec2 resolution;
    uniform vec2 pointer;
    uniform float scroll;
    float lines(float p, float spacing){return abs(mod(p+spacing*.5,spacing)-spacing*.5);}
    void main(){
      vec2 uv=(gl_FragCoord.xy/resolution)*2.-1.;
      uv.x*=resolution.x/resolution.y;
      vec3 ro=vec3(pointer.x*.20, pointer.y*.08, -4.+scroll*.5);
      vec3 rd=normalize(vec3(uv.x-.86-pointer.x*.025,uv.y+.10-pointer.y*.025,1.65));
      float dist=150.; float face=0.; float t;
      if(rd.y<-.001){t=(-1.7-ro.y)/rd.y;if(t>0.&&t<dist){dist=t;face=1.;}}
      if(rd.y>.001){t=(2.1-ro.y)/rd.y;if(t>0.&&t<dist){dist=t;face=2.;}}
      if(rd.x<-.001){t=(-3.4-ro.x)/rd.x;if(t>0.&&t<dist){dist=t;face=3.;}}
      if(rd.x>.001){t=(3.4-ro.x)/rd.x;if(t>0.&&t<dist){dist=t;face=4.;}}
      vec3 p=ro+rd*dist;
      float frame=lines(p.z,5.4);
      float groove=lines(p.z,1.08);
      vec3 base=vec3(.095,.155,.183);
      float light=0.; float bounce=0.;
      if(face==2.){
        light=1.-smoothstep(.025,.055,frame);
        bounce=.025/(frame+.16);
        base*=.9;
        base-=.025*(1.-smoothstep(.009,.02,lines(p.x,1.1)));
      }else if(face>2.){
        light=1.-smoothstep(.025,.055,frame);
        bounce=.04/(frame+.20);
        base*=.70+.10*cos(p.y*1.2);
        base-=.015*(1.-smoothstep(.008,.018,groove));
      }else{
        base=vec3(.065,.112,.135);
        float edge=smoothstep(1.3,3.4,abs(p.x));
        light=(1.-smoothstep(.04,.18,frame))*edge*.4;
        bounce=.05/(frame+.32)*(.2+edge);
        float grid=min(lines(p.x,1.1),groove);
        base-=.014*(1.-smoothstep(.008,.018,grid));
      }
      vec3 color=base+vec3(.39,.65,.72)*bounce+vec3(.66,.88,.92)*light*1.5;
      float fog=1.-exp(-max(0.,dist-3.)*.022);
      color=mix(color,vec3(.14,.23,.27),fog);
      // Light spill belongs to the physical vanishing point rather than a decorative blob.
      color+=vec3(.06,.10,.11)*exp(-length(vec2(uv.x-.86,uv.y+.10))*2.2);
      color+=((fract(sin(dot(gl_FragCoord.xy,vec2(12.98,78.23)))*43758.54))-.5)*.006;
      gl_FragColor=vec4(color,1.);
    }`;
  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      throw new Error("Light scene unavailable");
    }
    return s;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
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
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, "resolution"),
    pointer = gl.getUniformLocation(program, "pointer"),
    scroll = gl.getUniformLocation(program, "scroll");
  let visible = false,
    frame = 0,
    targetX = 0,
    targetY = 0,
    x = 0,
    y = 0,
    dirty = true;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, innerWidth < 768 ? 1 : 1.5);
    canvas.width = Math.round(stage.clientWidth * dpr);
    canvas.height = Math.round(stage.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    dirty = true;
    schedule();
  }
  function draw() {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) return;
    x += (targetX - x) * 0.1;
    y += (targetY - y) * 0.1;
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform2f(pointer, x, y);
    gl.uniform1f(scroll, Math.min(1, scrollY / stage.clientHeight));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    stage.classList.add("is-ready");
    dirty = false;
    if (Math.abs(x - targetX) + Math.abs(y - targetY) > 0.001) schedule();
  }
  function schedule() {
    if (!frame && visible && !document.hidden && !reduced.matches)
      frame = requestAnimationFrame(draw);
  }
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) {
        dirty = true;
        schedule();
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { threshold: 0 },
  );
  observer.observe(stage);
  new ResizeObserver(resize).observe(stage);
  const hero = stage.closest("section");
  hero.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch") return;
      const r = hero.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width) * 2 - 1;
      targetY = ((e.clientY - r.top) / r.height) * 2 - 1;
      schedule();
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    targetX = targetY = 0;
    schedule();
  });
  window.addEventListener(
    "scroll",
    () => {
      if (visible) {
        dirty = true;
        schedule();
      }
    },
    { passive: true },
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else if (dirty || visible) schedule();
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      stage.classList.remove("is-ready");
    } else {
      dirty = true;
      schedule();
    }
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    visible = false;
    cancelAnimationFrame(frame);
    stage.classList.remove("is-ready");
  });
  resize();
}
