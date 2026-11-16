// J.A.R.V.I.S. "AI mist": a living, flowing nebula drawn with WebGL. Reacts to Jarvis' voice level.
// new Mist(canvas).start(); m.mode = 'idle'|'listen'|'think'|'speak'; m.level = 0..1 (set every frame while speaking)
(function () {
  const FS = `precision mediump float;
uniform vec2 R; uniform float T, L, K; uniform vec3 C1, C2, C3;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++) { v += a * n(p); p = m * p; a *= .5; } return v; }
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * R) / min(R.x, R.y);
  float t = T * (.18 + K * .5);
  float d = length(uv), an = atan(uv.y, uv.x);
  vec2 q = vec2(fbm(uv * 1.7 + vec2(t, -t * .7)), fbm(uv * 1.7 + vec2(5.2 - t * .8, 1.3 + t * .6)));
  vec2 r = vec2(fbm(uv * 2.2 + 3.2 * q + vec2(1.7, 9.2) + t * .9), fbm(uv * 2.2 + 3.2 * q + vec2(8.3, 2.8) - t * .8));
  float f = fbm(uv * 2.4 + 3.5 * r);
  float rad = .27 + .09 * L + .035 * sin(an * 3. + T * 1.3) * (.4 + L) + .03 * sin(an * 5. - T * 1.9) * L + .09 * (f - .45);
  float body = smoothstep(rad + .22, rad - .06, d);
  float core = smoothstep(rad * .8, 0., d);
  vec3 col = mix(C1, C2, clamp(q.x * 1.7 - .25, 0., 1.));
  col = mix(col, C3, clamp(r.y * r.y * 2.1 - .2, 0., 1.) * .75);
  col += vec3(1.) * pow(f, 2.6) * (.55 + 1.1 * L);
  col += C1 * core * (.25 + .6 * L);
  float halo = exp(-d * 3.3) * (.22 + .35 * L);
  float a = clamp(body * (.5 + .7 * f) + halo, 0., 1.) * smoothstep(.5, .34, d);
  gl_FragColor = vec4(col * a, a);
}`;
  const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
  const PAL = {
    day: { speak: [[.35, .85, 1.], [.55, .35, 1.], [1., .78, .38]], listen: [[.25, .75, 1.], [.2, .45, 1.], [.6, .95, 1.]], think: [[.6, .4, 1.], [.25, .6, 1.], [1., .5, .85]], idle: [[.35, .7, 1.], [.45, .35, .95], [.95, .75, .45]] },
    night: { speak: [[1., .35, .4], [.75, .15, .45], [1., .7, .45]], listen: [[1., .4, .45], [.6, .1, .3], [1., .75, .7]], think: [[.9, .25, .55], [.5, .1, .35], [1., .5, .5]], idle: [[.9, .3, .35], [.5, .1, .3], [1., .6, .45]] },
  };
  class Mist {
    constructor(canvas) {
      this.c = canvas; this.mode = 'idle'; this.level = 0; this.lv = 0; this.k = 0; this.cols = null; this.on = false;
      const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
      this.gl = gl; if (!gl) return;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
      this.u = Object.fromEntries(['R', 'T', 'L', 'K', 'C1', 'C2', 'C3'].map(k => [k, gl.getUniformLocation(pr, k)]));
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
    size() { const dpr = Math.min(1.6, window.devicePixelRatio || 1), w = this.c.clientWidth, h = this.c.clientHeight; if (this.c.width !== Math.round(w * dpr) || this.c.height !== Math.round(h * dpr)) { this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr); } }
    start() { if (!this.gl || this.on) return this; this.on = true; this.t0 = performance.now(); const loop = () => { if (!this.on) return; this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); return this; }
    stop() { this.on = false; }
    frame() {
      const gl = this.gl; this.size(); if (!this.c.width) return;
      const night = document.body.classList.contains('night');
      const target = (PAL[night ? 'night' : 'day'][this.mode] || PAL.day.idle);
      if (!this.cols) this.cols = target.map(c => c.slice());
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) this.cols[i][j] += (target[i][j] - this.cols[i][j]) * 0.04;
      const t = (performance.now() - this.t0) / 1000;
      const want = this.mode === 'speak' ? this.level : this.mode === 'listen' ? .18 + .1 * Math.sin(t * 2.2) : this.mode === 'think' ? .25 + .08 * Math.sin(t * 5) : .08 + .05 * Math.sin(t * 1.1);
      this.lv += (want - this.lv) * (want > this.lv ? .35 : .12);
      this.k += ((this.mode === 'think' ? 1 : this.mode === 'speak' ? .45 : this.mode === 'listen' ? .3 : .1) - this.k) * .03;
      gl.viewport(0, 0, this.c.width, this.c.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(this.u.R, this.c.width, this.c.height); gl.uniform1f(this.u.T, t); gl.uniform1f(this.u.L, this.lv); gl.uniform1f(this.u.K, this.k);
      gl.uniform3fv(this.u.C1, this.cols[0]); gl.uniform3fv(this.u.C2, this.cols[1]); gl.uniform3fv(this.u.C3, this.cols[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }
  window.Mist = Mist;
})();
