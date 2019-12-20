#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_cybin;
uniform vec3 u_xyz;
uniform vec3 u_cam;

uniform sampler2D u_buffer0;
uniform sampler2D u_buffer1;

float rand31(vec3 v){return fract(cos(dot(v,vec3(13.46543,67.1132,123.546123)))*43758.5453);}
float random (in float x) {return fract(sin(x)*43758.5453123);}
float random (vec2 st) {return fract(sin(dot(st.xy, vec2(12.9898,78.233)))*43758.5453123);}
vec2 uv2xy(vec2 uv) {return (uv-0.5)*vec2(1.,u_resolution.x/u_resolution.y);}
vec2 xy2uv(vec2 xy) {return xy*vec2(1.,u_resolution.y/u_resolution.x)+0.5;}
vec2 c2p(vec2 c){return vec2(atan(c.y,c.x),length(c));}
vec2 p2c(vec2 p){return vec2(cos(p.x)*p.y,sin(p.x)*p.y);}
vec2 min2(vec2 a, vec2 b){return a.x>b.x?b:a;}

vec2 crep(vec2 uv, float c, float r){
  uv=c2p(uv);
  uv.x=uv.x+PI;
  uv.x=mod(uv.x,2.*PI/c);
  uv.x=abs(uv.x-PI/c);
  uv.x=uv.x-PI+r;
  return p2c(uv);
}

vec3 look(vec2 uv, vec3 o, vec3 t)
{
  vec3 fwd=normalize(t-o);
  vec3 right=normalize(cross(fwd,vec3(0.,1.,0.)));
  vec3 up=normalize(cross(fwd,right));
  return fwd+right*uv.x+up*uv.y;
}

float box(vec3 p, float s)
{
  float d=abs(p.y)-s;
  d=max(d,abs(p.x)-s);
  d=max(d,abs(p.z)-s);
  return d;
}

vec4 mprop(float mat)
{
  if(mat==0.) return vec4(vec3(2.5),-1.);
  if(mat==1.) return vec4(vec3(0.9,0.8,0.7)*0.5,0.5);
  if(mat==2.) return vec4(vec3(.7,0.8,0.9),0.05);
  if(mat==3.) return vec4(vec3(1.,0.8,0.6)*5.,-1.);
  return vec4(vec3(3.),-1.);
}

float hbox(vec3 p, float size, float thickness)
{
  vec3 q=p;
  p=abs(p);
  float bbox=max(max(abs(p.x),abs(p.z)),abs(p.y))-size;
  p-=size;
  float d=max(abs(p.x),abs(p.z))-thickness;
  d=min(d,max(abs(p.x),abs(p.y))-thickness);
  d=min(d,max(abs(p.z),abs(p.y))-thickness);
  d=max(d,bbox);
  return d;
}

vec2 map(vec3 p)
{
  float e=100.;
  for(int i=0;i<3;i++)
  {
    p.xy=crep(p.xy,3.,u_mouse.x*5./u_resolution.x);
    p=abs(p);
    p-=0.4;
    p.xyz=p.zxy;
  }
  //e=min(e,hbox(p,2.,1.2));
  float f=hbox(p,2.5,1.55555);
  e=max(e,-f);
  //g=min(g,max(abs(p.x),abs(p.y))-0.1);
  float g=max(abs(p.x),abs(p.z))-0.01;
  p-=5.;
  g=min(g,max(abs(p.x),abs(p.z))-0.01);
  g=min(g,max(abs(p.x),abs(p.y))-0.01);
  return min2(vec2(e,2.),vec2(g,3.));
}

vec2 map1(vec3 p)
{
  vec3 q=p;
  for(int i=0;i<3;i++)
  {
    p.xz=crep(p.xz,3.,u_cybin);
    p+=0.1;
    float t=p.x;p.x=p.y;p.y=p.z;p.z=t;
  }
  vec2 d = vec2(max(box(abs(p)-.5,.3),-box(p,.7)),1.);
  d=min2(d,vec2(max(-q.y+1.4,length(q.xz)-2.),2.));
  d=min2(d,vec2(length(q)-0.3,0.));
  return d;
}

vec3 gradient(vec3 p)
{
  vec2 e=vec2(0.,0.01);
  return normalize(vec3(map(p+e.yxx).x-map(p-e.yxx).x,
        map(p+e.xyx).x-map(p-e.xyx).x,
        map(p+e.xxy).x-map(p-e.xxy).x));
}

vec3 diffuse(vec3 r, vec3 p, float a)
{
  vec3 x=cross(r,vec3(0.,1.,0.));
  vec3 y=cross(r,x);
  return r+x*rand31(p+u_time)*a+y*rand31(p.zxy*PI+u_time)*a; 
}

#define MAX_DIST 20.
vec2 march(vec3 o, vec3 r, float it)
{
  float t=it;
  for(int i=0;i<90;i++)
  {
    vec2 res=map(o+r*t);
    float d=res.x;
    if(d<0.001) return vec2(t,res.y);
    if(t>MAX_DIST) return vec2(MAX_DIST,-1.);
    t+=max(0.002,d*0.75);
  }
  return vec2(MAX_DIST,-1.);
}


vec3 pixel(vec2 uv)
{
  float u_time=u_time/5.;
  vec3 o=vec3(cos(u_time),0.,sin(u_time))*10.*u_mouse.x/u_resolution.x;
  o=u_cam*2.;
  vec3 t=vec3(0.);

  vec3 r=look(uv,o,t);

  float dt=0.;
  float maxd=10.;
  vec4 mat=vec4(0.);
  vec3 lum=vec3(0.);
  vec3 ab=vec3(1.);
  vec2 res=march(o,r,0.1);
  for(int i=0;i<6;i++)
  {
    vec2 res=march(o,r,0.05);
    float d=res.x;
    dt+=d;
    mat=mprop(res.y);
    if(mat.a<0.) {lum+=mat.rgb;break;}
    ab*=mat.rgb;
    vec3 p=o+r*d-0.005;
    vec3 n=gradient(p);
    o=p;
    r=reflect(diffuse(r,o,mat.a),n);
  }
  return vec3(lum*ab/pow(1.15,dt));
}

void main (void) {
  vec2 uv = gl_FragCoord.xy/u_resolution.xy;
  vec2 xy = uv2xy(uv);
  vec3 color=vec3(1.);
#ifdef BUFFER_0
  vec3 last=texture2D(u_buffer1,uv).rgb;
  if(random(uv*u_time)>1./30.)
  {
    gl_FragColor = vec4(last,1.);
    return;
  }
  float c=3./5.;
  color=pixel(xy)*c+last*(1.-c);
#elif defined(BUFFER_1)
  color=texture2D(u_buffer0,gl_FragCoord.xy/u_resolution.x).rgb;
#else
  color=texture2D(u_buffer1,gl_FragCoord.xy/u_resolution.x).rgb;
#endif
  gl_FragColor = vec4(color,1.);
}
