// Photo-based Fritchle radio cabinet, c.1931. Millimetres, grille faces +Z, feet on Y=0.
export const meta = {
  name: 'Fritchle radio', order: 1,
  description: 'Oliver P. Fritchle\'s c.1931 TRF radio in his patented walnut cabinet: a bell-waisted speaker case with a pierced fan grille over cloth, a recessed control well with a brass drum-dial escutcheon and three knobs, on cabriole legs. Photo-based interpretation.',
};
export const params = [
  { id: 'dial', label: 'Tuning dial', type: 'number', group: 'Radio controls', min: 0, max: 100, step: 1, default: 40, help: 'Turns the centre knob and scrolls the numbered drum behind the escutcheon window.' },
  { id: 'volume', label: 'Volume', type: 'number', group: 'Radio controls', min: 0, max: 100, step: 1, default: 50, unit: '%', help: 'Rotates the left knob. Control assignment is inferred from a typical TRF set; no audio is generated.' },
  { id: 'power', label: 'Power', type: 'select', group: 'Radio controls', default: 'off', options: [{value:'on',label:'On'},{value:'off',label:'Off'}], help: 'Turns the right knob between its off and on detents. The set has no lamps, so nothing lights.' },
];
export const presets = [
  {name:'As displayed',params:{power:'off',dial:40,volume:50}},
  {name:'Evening listening',params:{power:'on',dial:62,volume:70}},
];
function bounded(p,id) {const spec=params.find(s=>s.id===id);const n=Number(p[id]??spec.default);return Math.max(spec.min,Math.min(spec.max,Number.isFinite(n)?n:spec.default));}
export function metrics(p) {return [
  {label:'Overall (H × W × D)',value:'1540 × 559 × 343 mm',note:'From the museum label, 5′ ⅝″ × 22″ × 13.5″. Section heights are proportioned from the photographs.'},
  {label:'Reference',value:'Oliver P. Fritchle · TRF radio · c.1931',note:'Cabinet design patented 1928.'},
  {label:'Dial reading',value:String(bounded(p,'dial')),note:'Drum scale 0–100; no station calibration is implied.'},
  {label:'Reconstruction',value:'Photo-based',note:'Fretwork, leg profile and escutcheon outline are interpretations, not measured drawings.'},
];}
export function build(p) {
  const C={walnut:0x5b3721,dark:0x40261a,cloth:0xb88f58,brass:0xa9894c,knob:0x3b2317,ivory:0xe6d7ae,ink:0x2a1a10,metal:0x7c7a72,cone:0x6e5a40,};
  const groups=new Map(), parts=[], deg=Math.PI/180;
  const dial=bounded(p,'dial'), volume=bounded(p,'volume'), on=(p.power??'off')==='on';
  function add(name,g,color) {const k=name+':'+color;if(!groups.has(k))groups.set(k,{name,color,gs:[]});groups.get(k).gs.push(g);}
  function box(name,x,y,z,w,h,d,color) {const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);add(name,g,color);}
  function rrect(x0,y0,x1,y1,r) {const s=new THREE.Shape();s.moveTo(x0+r,y0);s.lineTo(x1-r,y0);s.quadraticCurveTo(x1,y0,x1,y0+r);s.lineTo(x1,y1-r);s.quadraticCurveTo(x1,y1,x1-r,y1);s.lineTo(x0+r,y1);s.quadraticCurveTo(x0,y1,x0,y1-r);s.lineTo(x0,y0+r);s.quadraticCurveTo(x0,y0,x0+r,y0);return s;}
  function poly(pts) {const s=new THREE.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
  // Front-facing solid from an XY shape, occupying z0..z0+depth.
  function panel(name,shape,z0,depth,color,bevel=0,segs=12) {
    const g=new THREE.ExtrudeGeometry(shape,{depth:depth-2*bevel,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:segs});
    g.translate(0,0,z0+bevel);add(name,g,color);
  }
  // Horizontal slab from a plan outline of [x, z] points, occupying y..y+h.
  function slab(name,pts,y,h,color) {
    const g=new THREE.ExtrudeGeometry(poly(pts.map(([x,z])=>[x,z])),{depth:h-1.2,steps:1,bevelEnabled:true,bevelSize:.6,bevelThickness:.6,bevelSegments:2});
    g.rotateX(Math.PI/2);g.translate(0,y+h-.6,0);add(name,g,color);
  }
  // Vertical board along a plan segment a→b, thickness t on the side of unit normal n.
  function wall(name,a,b,y0,y1,t,n,color) {
    const dx=b[0]-a[0], dz=b[1]-a[1], L=Math.hypot(dx,dz);
    const g=new THREE.BoxGeometry(L,y1-y0,t);g.rotateY(Math.atan2(-dz,dx));
    g.translate((a[0]+b[0])/2+n[0]*t/2,(y0+y1)/2,(a[1]+b[1])/2+n[1]*t/2);add(name,g,color);
  }
  function tube(name,pts,r,color,radial=6) {
    const path=new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v)));
    add(name,new THREE.TubeGeometry(path,Math.max(8,pts.length*2),r,radial,false),color);
  }
  function text(name,str,x,y,z,size,color) {
    const scale=size/1000;let cursor=-[...str].reduce((n,c)=>n+(GLYPHS[c]?.ha||350),0)*scale/2;const shapes=[];
    for(const c of str){const gl=GLYPHS[c];if(!gl){cursor+=350*scale;continue;}const path=new THREE.ShapePath(),t=(gl.o||'').split(' ');let i=0;
      const pt=()=>[Number(t[i++])*scale+cursor+x,Number(t[i++])*scale-size*.36+y];
      while(i<t.length){const op=t[i++];if(op==='m')path.moveTo(...pt());else if(op==='l')path.lineTo(...pt());else if(op==='q'){const e=pt(),cp=pt();path.quadraticCurveTo(...cp,...e);}else if(op==='b'){const e=pt(),c1=pt(),c2=pt();path.bezierCurveTo(...c1,...c2,...e);}}
      shapes.push(...path.toShapes());cursor+=gl.ha*scale;}
    if(shapes.length){const g=new THREE.ShapeGeometry(shapes,3);g.translate(0,0,z);add(name,g,color);}
  }

  // ---- Stand: shaped apron on four cabriole legs. ----
  const AY=532, AH=96, AX=245, AZ0=30, AZ1=-255, AZC=(AZ0+AZ1)/2;
  // Lower edge of an apron of length L: low at the knees, arched, with a small drop at the centre.
  function apronEdge(L) {
    const h=L/2, V=(x,y)=>new THREE.Vector2(x,y), path=new THREE.CurvePath();
    path.add(new THREE.CubicBezierCurve(V(-h,0),V(-h+14,0),V(-h+30,44),V(-h+68,46)));
    path.add(new THREE.CubicBezierCurve(V(-h+68,46),V(-h*.5,48),V(-26,44),V(0,34)));
    path.add(new THREE.CubicBezierCurve(V(0,34),V(26,44),V(h*.5,48),V(h-68,46)));
    path.add(new THREE.CubicBezierCurve(V(h-68,46),V(h-30,44),V(h-14,0),V(h,0)));
    return path.getPoints(16);
  }
  function apron(L,y0=0) {const e=apronEdge(L);return poly([[-L/2,y0+AH],...e.map(v=>[v.x,y0+v.y]),[L/2,y0+AH]]);}
  panel('Shaped apron',apron(2*AX,AY),AZ0-18,18,C.walnut);
  const frontEdge=apronEdge(2*AX);
  tube('Apron bead',frontEdge.map(v=>[v.x,AY+v.y+1.5,AZ0+.5]),3,C.dark);
  const sideL=AZ0-AZ1, sideEdge=apronEdge(sideL);
  for(const sx of [-1,1]) {
    const g=new THREE.ExtrudeGeometry(apron(sideL),{depth:18,bevelEnabled:false,curveSegments:12});
    g.rotateY(Math.PI/2);g.translate(sx>0?AX-18:-AX,AY,AZC);add('Shaped apron',g,C.walnut);
    tube('Apron bead',sideEdge.map(v=>[sx*(AX+.5),AY+v.y+1.5,AZC-v.x]),3,C.dark);
  }
  box('Rear apron',0,AY+AH/2+20,AZ1+9,2*AX-4,AH-40,18,C.walnut);
  // Cabriole legs: a lofted round section swept along an S-curve in the leg's diagonal plane.
  // [height, outward offset, radius]. The knee bulges just below the apron, then the leg runs back
  // onto the post centre and on up inside it, so leg and apron read as one piece.
  const LEG=[[22,-10,12],[60,-14,11],[140,-10,13],[250,2,17],[350,16,21],[440,26,25],[495,20,26],[AY,7,24],[AY+30,1,22],[AY+60,0,21]];
  function leg(lx,lz) {
    const dx=Math.sign(lx)/Math.SQRT2, dz=Math.sign(lz-AZC)/Math.SQRT2, P=new THREE.Vector3(-dz,0,dx);
    const at=(h,o)=>new THREE.Vector3(lx+dx*o,h,lz+dz*o);
    const path=new THREE.CatmullRomCurve3(LEG.map(([h,o])=>at(h,o))), radius=new THREE.CatmullRomCurve3(LEG.map(([,,r])=>new THREE.Vector3(r,0,0)));
    const rings=40, sides=20, pos=[], idx=[];
    for(let i=0;i<=rings;i++) {
      const t=i/rings, c=path.getPoint(t), T=path.getTangent(t), U=new THREE.Vector3().crossVectors(T,P).normalize(), r=radius.getPoint(t).x;
      for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;pos.push(c.x+r*(Math.cos(a)*U.x+Math.sin(a)*P.x),c.y+r*(Math.cos(a)*U.y+Math.sin(a)*P.y),c.z+r*(Math.cos(a)*U.z+Math.sin(a)*P.z));}
    }
    for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;idx.push(a,c,b,b,c,d);}
    const bottom=pos.length/3;pos.push(...path.getPoint(0).toArray());for(let j=0;j<sides;j++)idx.push(bottom,j,(j+1)%sides);
    const top=pos.length/3, last=rings*sides;pos.push(...path.getPoint(1).toArray());for(let j=0;j<sides;j++)idx.push(top,last+(j+1)%sides,last+j);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
    add('Cabriole legs',g,C.walnut);
    box('Leg posts',lx,AY+50+(AH-50)/2,lz,40,AH-50,40,C.walnut); // above the leg top, behind the apron
    // Pad foot with carved ribs on its outer face.
    const foot=at(13.8,-12), out=new THREE.Vector3(dx,0,dz);
    const pad=new THREE.SphereGeometry(22,18,10);pad.scale(1.05,.62,1.05);pad.translate(foot.x,foot.y,foot.z);add('Carved pad feet',pad,C.dark);
    for(let k=-3;k<=3;k++) {
      const psi=k*22*deg, dir=out.clone().multiplyScalar(Math.cos(psi)).add(P.clone().multiplyScalar(Math.sin(psi))), pts=[];
      for(let s=0;s<=6;s++){const el=(-25+s*15)*deg;pts.push([foot.x+dir.x*23.4*Math.cos(el),foot.y+13.8*Math.sin(el),foot.z+dir.z*23.4*Math.cos(el)]);}
      tube('Foot carving',pts,1.5,0x2c1a10,5);
    }
  }
  for(const lx of [-(AX-20),AX-20])for(const lz of [AZ0-20,AZ1+20])leg(lx,lz);

  // ---- Control compartment with canted front corners and a recessed panel. ----
  const SY=628, CY0=645, CY1=878, TY=892, CX=270, CF=215, CZ0=55, CZ1=-278, CH=-10;
  slab('Compartment sill',[[-CX-10,CZ1-3],[CX+10,CZ1-3],[CX+10,CH+2],[CF+5,CZ0+7],[-CF-5,CZ0+7],[-CX-10,CH+2]],SY,CY0-SY,C.walnut);
  slab('Compartment top',[[-CX,CZ1],[CX,CZ1],[CX,CH],[CF,CZ0],[-CF,CZ0],[-CX,CH]],CY1,TY-CY1,C.walnut);
  for(const s of [-1,1]) {
    wall('Compartment sides',[s*CX,CZ1],[s*CX,CH],CY0,CY1,15,[-s,0],C.walnut);
    const n=[-s*65/85,-55/85];wall('Canted corners',[s*CX,CH],[s*CF,CZ0],CY0,CY1,15,n,C.walnut);
    wall('Recess cheeks',[s*(CF-2),CZ0-5],[s*190,-15],CY0,CY1-24,10,[s*.94,-.33],C.walnut);
  }
  box('Top rail',0,CY1-12,CZ0-8,2*CF,24,16,C.walnut);
  const PZ=-15; // front face of the recessed control panel
  box('Control panel',0,(CY0+CY1-24)/2,PZ-5,380,CY1-24-CY0,10,C.walnut);
  // Brass cartouche escutcheon with the drum-dial window.
  const EY=757, half=[[0,50],[5,47],[9,49],[14,45],[18,40],[25,33],[27,22],[24,12],[27,2],[26,-10],[21,-20],[25,-28],[20,-38],[12,-44],[5,-46],[0,-50]];
  const esc=poly([...half.map(([x,y])=>[x,y+EY]),...half.slice(1,-1).reverse().map(([x,y])=>[-x,y+EY])]);
  const WY=EY+14;
  esc.holes.push(new THREE.Path(rrect(-13,WY-17,13,WY+17,2).getPoints(4)));
  panel('Brass escutcheon',esc,PZ,2.4,C.brass,.5);
  for(const y of [EY+40,EY-34])box('Escutcheon screws',0,y,PZ+2.6,3,3,1,0x6d5a30);
  panel('Escutcheon shield',poly([[-6,EY-14],[6,EY-14],[6,EY-22],[0,EY-28],[-6,EY-22]]),PZ+2.4,1,C.brass,.3);
  // Drum dial seen through the window: numbers every ten, ticks every two, fixed hairline.
  box('Drum dial',0,WY,PZ+.1,26,34,.2,C.ivory);
  const drumY=v=>WY+(dial-v)*1.4;
  for(let v=0;v<=100;v+=10)if(Math.abs(drumY(v)-WY)<=11)text('Drum numerals',String(v),-3,drumY(v),PZ+.3,5,C.ink);
  for(let v=0;v<=100;v+=2)if(Math.abs(drumY(v)-WY)<=15.5)box('Drum ticks',8.5,drumY(v),PZ+.3,v%10?3:6,.5,.1,C.ink);
  box('Dial hairline',0,WY,PZ+.5,24,.5,.1,0x8a1f14);
  function knob(name,x,y,r,angle) {
    const base=new THREE.CylinderGeometry(r+3,r+3.5,3,28);base.rotateX(Math.PI/2);base.translate(x,y,PZ+1.5);add('Knob skirts',base,C.knob);
    const body=new THREE.CylinderGeometry(r*.92,r,14,28);body.rotateX(Math.PI/2);body.translate(x,y,PZ+10);add(name,body,C.knob);
    const ring=new THREE.TorusGeometry(r*.62,.8,6,28);ring.translate(x,y,PZ+17.1);add(name+' ring',ring,0x55331f);
    const mark=new THREE.BoxGeometry(1.4,r*.5,.6);mark.translate(0,r*.62,0);mark.rotateZ(-angle);mark.translate(x,y,PZ+17.2);add(name+' index',mark,C.ivory);
  }
  knob('Tuning knob',0,681,15,(dial/100*300-150)*deg);
  knob('Volume knob',-70,665,12,(volume/100*270-135)*deg);
  knob('Power knob',73,662,12,(on?40:-40)*deg);
  // Chassis behind the panel, visible through the open back.
  box('Chassis',0,664,-150,400,8,200,C.metal);
  for(const [x,z] of [[-120,-120],[-60,-190],[0,-120],[60,-190],[120,-120]]) {
    const t=new THREE.CylinderGeometry(17,17,78,20);t.translate(x,668+39,z);add('Tube shields',t,C.metal);
    const cap=new THREE.CylinderGeometry(14,17,5,20);cap.translate(x,668+80,z);add('Tube shields',cap,0x6a6862);
  }
  box('Power transformer',160,700,-235,60,64,50,0x55544f);

  // ---- Speaker case: a bell-waisted shell, round on top, flaring to its base. ----
  const YB=905, RC=235, YC=1540-RC, HB=240, UZ=-275, RG=RC-39; // RG: fretwork radius
  // Silhouette inset by t: circle on top, concave sides curving out to the base.
  function silhouette(t) {
    const r=RC-t, jx=195-t*.8, dy=-Math.sqrt(r*r-jx*jx), jy=YC+dy, tx=-dy/r, ty=-jx/r, bx=HB-t, by=YB+t;
    const V=(x,y)=>new THREE.Vector2(x,y);
    const left=new THREE.CubicBezierCurve(V(-bx,by),V(-bx+4,by+100),V(-jx+tx*95,jy+ty*95),V(-jx,jy));
    const right=new THREE.CubicBezierCurve(V(jx,jy),V(jx-tx*95,jy+ty*95),V(bx-4,by+100),V(bx,by));
    const s=new THREE.Shape(), bz=(c)=>s.bezierCurveTo(c.v1.x,c.v1.y,c.v2.x,c.v2.y,c.v3.x,c.v3.y);s.moveTo(-bx,by);bz(left);
    s.absarc(0,YC,r,Math.atan2(dy,-jx)+Math.PI*2,Math.atan2(dy,jx),true);
    bz(right);s.lineTo(-bx,by);
    return {shape:s,left,right};
  }
  // The inner outline runs the same way round as the outer one; reverse it so its walls face the cavity.
  const shell=silhouette(0).shape;shell.holes.push(new THREE.Path(silhouette(18).shape.getPoints(24).reverse()));
  panel('Speaker case shell',shell,UZ,-UZ,C.walnut,0,24);
  const circleHole=r=>{const h=new THREE.Path();h.absarc(0,YC,r,0,Math.PI*2,true);return h;};
  const board=silhouette(2).shape;board.holes.push(circleHole(RG+1));panel('Speaker case front',board,-13,12,C.walnut,0,24);
  const back=silhouette(2).shape;back.holes.push(circleHole(150));panel('Speaker case back',back,UZ+3,10,C.walnut,0,24);
  const bead=silhouette(26);
  for(const c of [bead.left,bead.right])tube('Waist bead',c.getPoints(24).map(v=>[v.x,v.y,-.4]),2.2,C.dark);
  slab('Case base moulding',[[-257,UZ-6],[257,UZ-6],[257,10],[-257,10]],TY,YB-TY,C.walnut);
  // Speaker behind the cloth.
  const cone=new THREE.CylinderGeometry(145,40,90,40,1,true);cone.rotateX(Math.PI/2);cone.translate(0,YC,-65);add('Speaker cone',cone,C.cone);
  // An open cone is single-sided; add a copy wound the other way so its inside shows from the back.
  const inside=cone.clone(), ix=inside.getIndex().array;for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];inside.computeVertexNormals();add('Speaker cone',inside,C.cone);
  const magnet=new THREE.CylinderGeometry(42,42,45,28);magnet.rotateX(Math.PI/2);magnet.translate(0,YC,-132);add('Speaker magnet',magnet,C.metal);
  const cloth=new THREE.CircleGeometry(RC-30,64);cloth.translate(0,YC,-14);add('Grille cloth',cloth,C.cloth);

  // ---- Pierced fan fretwork: petals radiating from a point below centre, scrolls and a stem. ----
  // Laid out on a 186 mm disc, then scaled to the grille.
  const FR=186, O=new THREE.Vector2(0,-95), fret=new THREE.Shape();fret.absarc(0,0,FR,0,Math.PI*2,false);
  const edge=u=>{const b=O.dot(u);return -b+Math.sqrt(b*b-O.lengthSq()+FR*FR);};
  const dirAt=a=>new THREE.Vector2(Math.sin(a),Math.cos(a));
  const PETALS=13, SPREAD=78*deg, step=2*SPREAD/(PETALS-1);
  for(let k=0;k<PETALS;k++) {
    const a=-SPREAD+k*step, u=dirAt(a), n=new THREE.Vector2(-u.y,u.x), d1=25, d2=.8*edge(u), w=Math.min(.4*step*d2,16), pts=[];
    const at=(d,o)=>O.clone().add(u.clone().multiplyScalar(d)).add(n.clone().multiplyScalar(o));
    for(let i=0;i<=8;i++){const d=d1+(d2-d1)*i/8;pts.push(at(d,Math.max(1.5,w*(i/8)**.7)));}
    for(let i=1;i<12;i++){const q=Math.PI/2-i/12*Math.PI;pts.push(at(d2+w*Math.cos(q),w*Math.sin(q)));}
    for(let i=8;i>=0;i--){const d=d1+(d2-d1)*i/8;pts.push(at(d,-Math.max(1.5,w*(i/8)**.7)));}
    fret.holes.push(new THREE.Path(pts));
    if(k<PETALS-1){const m=dirAt(a+step/2), c=O.clone().add(m.multiplyScalar(.9*edge(m)));const h=new THREE.Path();h.absellipse(c.x,c.y,7,7,0,Math.PI*2,true);fret.holes.push(h);}
  }
  for(const s of [-1,1]) {
    // Crescent along the lower rim, a round scroll eye and a slot beside the central stem.
    const cres=[];for(let i=0;i<=10;i++){const a=(s<0?212+i*3.8:328-i*3.8)*deg;cres.push(new THREE.Vector2(176*Math.cos(a),176*Math.sin(a)));}
    for(let i=10;i>=0;i--){const a=(s<0?212+i*3.8:328-i*3.8)*deg;cres.push(new THREE.Vector2(160*Math.cos(a),160*Math.sin(a)));}
    fret.holes.push(new THREE.Path(cres));
    const eye=new THREE.Path();eye.absellipse(s*80,-112,15,13,0,Math.PI*2,true);fret.holes.push(eye);
    fret.holes.push(new THREE.Path([[s*6,-105],[s*12,-104],[s*25,-158],[s*19,-161]].map(([x,y])=>new THREE.Vector2(x,y))));
  }
  const fg=new THREE.ExtrudeGeometry(fret,{depth:6,steps:1,bevelEnabled:true,bevelSize:1,bevelThickness:1,bevelSegments:2,curveSegments:48});
  fg.scale(RG/FR,RG/FR,1);fg.translate(0,YC,-10);add('Pierced fan fretwork',fg,C.walnut);
  const bezel=new THREE.TorusGeometry(RC-25,15,14,96);bezel.scale(1,1,.75);bezel.translate(0,YC,1);add('Grille bezel',bezel,C.walnut);

  for(const {name,color,gs} of groups.values())
    parts.push({name,color,geometry:merge(gs),roughness:name.includes('cloth')||name.includes('Chassis')||name.includes('interior')?.9:name.includes('Brass')?.35:.4});
  return parts;
}

/* Embedded label glyphs from the bundled Helvetiker font.
Copyright @ 2004 by MAGENTA Ltd. All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of the fonts accompanying this license ("Fonts") and associated documentation files (the "Font Software"), to reproduce and distribute the Font Software, including without limitation the rights to use, copy, merge, publish, distribute, and/or sell copies of the Font Software, and to permit persons to whom the Font Software is furnished to do so, subject to the following conditions:

The above copyright and this permission notice shall be included in all copies of one or more of the Font Software typefaces.

The Font Software may be modified, altered, or added to, and in particular the designs of glyphs or characters in the Fonts may be modified and additional glyphs or characters may be added to the Fonts, only if the fonts are renamed to names not containing the word "MgOpen", or if the modifications are accepted for inclusion in the Font Software itself by the each appointed Administrator.

This License becomes null and void to the extent applicable to Fonts or Font Software that has been modified and is distributed under the "MgOpen" name.

The Font Software may be sold as part of a larger software package but no copy of one or more of the Font Software typefaces may be sold by itself.

THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL MAGENTA OR PERSONS OR BODIES IN CHARGE OF ADMINISTRATION AND MAINTENANCE OF THE FONT SOFTWARE BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.

*/
const GLYPHS = {"S":{"ha":890,"o":"m 788 291 q 662 54 788 144 q 397 -26 550 -26 q 116 68 226 -26 q 0 337 0 168 l 131 337 q 200 152 131 220 q 384 85 269 85 q 557 129 479 85 q 650 270 650 183 q 490 429 650 379 q 194 513 341 470 q 33 739 33 584 q 142 964 33 881 q 388 1041 242 1041 q 644 957 543 1041 q 756 716 756 867 l 625 716 q 561 874 625 816 q 395 933 497 933 q 243 891 309 933 q 164 759 164 841 q 325 609 164 656 q 625 526 475 568 q 788 291 788 454 "},"J":{"ha":699,"o":"m 588 279 q 287 -26 588 -26 q 58 73 126 -26 q 0 327 0 158 l 133 327 q 160 172 133 227 q 288 96 198 96 q 426 171 391 96 q 449 336 449 219 l 449 1013 l 588 1013 l 588 279 "},"D":{"ha":935,"o":"m 389 1013 q 714 867 593 1013 q 828 521 828 729 q 712 161 828 309 q 382 0 587 0 l 0 0 l 0 1013 l 389 1013 m 376 124 q 607 247 523 124 q 681 510 681 355 q 607 771 681 662 q 376 896 522 896 l 139 896 l 139 124 l 376 124 "},"-":{"ha":478,"o":"m 350 317 l 8 317 l 8 428 l 350 428 l 350 317 "},"Q":{"ha":1072,"o":"m 954 5 l 887 -79 l 744 35 q 622 -11 687 2 q 483 -26 556 -26 q 127 130 262 -26 q 0 504 0 279 q 127 880 0 728 q 484 1041 262 1041 q 841 884 708 1041 q 968 507 968 735 q 933 293 968 398 q 832 104 899 188 l 954 5 m 723 191 q 802 330 777 248 q 828 499 828 412 q 744 790 828 673 q 483 922 650 922 q 228 791 322 922 q 142 505 142 673 q 227 221 142 337 q 487 91 323 91 q 632 123 566 91 l 520 215 l 587 301 l 723 191 "},"M":{"ha":1067,"o":"m 954 0 l 819 0 l 819 869 l 537 0 l 405 0 l 128 866 l 128 0 l 0 0 l 0 1013 l 200 1013 l 472 160 l 757 1013 l 954 1013 l 954 0 "},"C":{"ha":944,"o":"m 886 379 q 760 87 886 201 q 455 -26 634 -26 q 112 136 236 -26 q 0 509 0 283 q 118 882 0 737 q 469 1041 245 1041 q 748 955 630 1041 q 879 708 879 859 l 745 708 q 649 862 724 805 q 473 920 573 920 q 219 791 312 920 q 136 509 136 675 q 217 229 136 344 q 470 99 311 99 q 672 179 591 99 q 753 379 753 259 l 886 379 "},"X":{"ha":940,"o":"m 854 0 l 683 0 l 423 409 l 166 0 l 0 0 l 347 519 l 18 1013 l 186 1013 l 428 637 l 675 1013 l 836 1013 l 504 520 l 854 0 "},"N":{"ha":914,"o":"m 801 0 l 651 0 l 131 823 l 131 0 l 0 0 l 0 1013 l 151 1013 l 670 193 l 670 1013 l 801 1013 l 801 0 "},"2":{"ha":792,"o":"m 731 0 l 59 0 q 197 314 59 188 q 457 487 199 315 q 598 691 598 580 q 543 819 598 772 q 411 867 488 867 q 272 811 328 867 q 209 630 209 747 l 81 630 q 182 901 81 805 q 408 986 271 986 q 629 909 536 986 q 731 694 731 826 q 613 449 731 541 q 378 316 495 383 q 201 122 235 234 l 731 122 l 731 0 "},"Z":{"ha":849,"o":"m 779 0 l 0 0 l 0 113 l 621 896 l 40 896 l 40 1013 l 779 1013 l 778 887 l 171 124 l 779 124 l 779 0 "},"B":{"ha":876,"o":"m 580 546 q 724 469 670 535 q 778 311 778 403 q 673 83 778 171 q 432 0 575 0 l 0 0 l 0 1013 l 411 1013 q 629 957 541 1013 q 732 768 732 892 q 691 633 732 693 q 580 546 650 572 m 393 899 l 139 899 l 139 588 l 379 588 q 521 624 462 588 q 592 744 592 667 q 531 859 592 819 q 393 899 471 899 m 419 124 q 566 169 504 124 q 635 303 635 219 q 559 436 635 389 q 402 477 494 477 l 139 477 l 139 124 l 419 124 "},"H":{"ha":915,"o":"m 803 0 l 667 0 l 667 475 l 140 475 l 140 0 l 0 0 l 0 1013 l 140 1013 l 140 599 l 667 599 l 667 1013 l 803 1013 l 803 0 "},"U":{"ha":904,"o":"m 796 393 q 681 93 796 212 q 386 -25 566 -25 q 101 95 208 -25 q 0 393 0 211 l 0 1013 l 138 1013 l 138 391 q 204 191 138 270 q 394 107 276 107 q 586 191 512 107 q 656 391 656 270 l 656 1013 l 796 1013 l 796 393 "},"F":{"ha":717,"o":"m 683 888 l 140 888 l 140 583 l 613 583 l 613 458 l 140 458 l 140 0 l 0 0 l 0 1013 l 683 1013 l 683 888 "},"V":{"ha":940,"o":"m 862 1013 l 505 0 l 361 0 l 0 1013 l 143 1013 l 434 165 l 718 1012 l 862 1013 "},"0":{"ha":792,"o":"m 394 -29 q 153 129 242 -29 q 73 479 73 272 q 152 829 73 687 q 394 989 241 989 q 634 829 545 989 q 715 479 715 684 q 635 129 715 270 q 394 -29 546 -29 m 394 89 q 546 211 489 89 q 598 479 598 322 q 548 748 598 640 q 394 871 491 871 q 241 748 298 871 q 190 479 190 637 q 239 211 190 319 q 394 89 296 89 "},"8":{"ha":792,"o":"m 571 527 q 694 424 652 491 q 736 280 736 358 q 648 71 736 158 q 395 -26 551 -26 q 142 69 238 -26 q 55 279 55 157 q 96 425 55 359 q 220 527 138 491 q 120 615 153 562 q 88 726 88 668 q 171 904 88 827 q 395 986 261 986 q 618 905 529 986 q 702 727 702 830 q 670 616 702 667 q 571 527 638 565 m 394 565 q 519 610 475 565 q 563 717 563 655 q 521 823 563 781 q 392 872 474 872 q 265 824 312 872 q 224 720 224 783 q 265 613 224 656 q 394 565 312 565 m 395 91 q 545 150 488 91 q 597 280 597 204 q 546 408 597 355 q 395 465 492 465 q 244 408 299 465 q 194 280 194 356 q 244 150 194 203 q 395 91 299 91 "},"R":{"ha":907,"o":"m 781 0 l 623 0 q 587 242 590 52 q 407 433 585 433 l 138 433 l 138 0 l 0 0 l 0 1013 l 396 1013 q 636 946 539 1013 q 749 731 749 868 q 711 597 749 659 q 608 502 674 534 q 718 370 696 474 q 729 207 722 352 q 781 26 736 62 l 781 0 m 373 551 q 533 594 465 551 q 614 731 614 645 q 532 859 614 815 q 373 896 465 896 l 138 896 l 138 551 l 373 551 "},"5":{"ha":792,"o":"m 738 314 q 626 60 738 153 q 382 -23 526 -23 q 155 47 248 -23 q 54 256 54 125 l 183 256 q 259 132 204 174 q 382 91 314 91 q 533 149 471 91 q 602 314 602 213 q 538 469 602 411 q 386 528 475 528 q 284 506 332 528 q 197 439 237 484 l 81 439 l 159 958 l 684 958 l 684 840 l 254 840 l 214 579 q 306 627 258 612 q 407 643 354 643 q 636 552 540 643 q 738 314 738 457 "},"7":{"ha":792,"o":"m 730 839 q 469 448 560 641 q 335 0 378 255 l 192 0 q 328 441 235 252 q 593 830 421 630 l 58 830 l 58 958 l 730 958 l 730 839 "},"K":{"ha":906,"o":"m 819 0 l 649 0 l 294 509 l 139 355 l 139 0 l 0 0 l 0 1013 l 139 1013 l 139 526 l 626 1013 l 809 1013 l 395 600 l 819 0 "},"E":{"ha":789,"o":"m 736 0 l 0 0 l 0 1013 l 725 1013 l 725 889 l 139 889 l 139 585 l 677 585 l 677 467 l 139 467 l 139 125 l 736 125 l 736 0 "},"Y":{"ha":886,"o":"m 820 1013 l 482 416 l 482 0 l 342 0 l 342 416 l 0 1013 l 140 1013 l 411 534 l 679 1012 l 820 1013 "},"L":{"ha":696,"o":"m 645 0 l 0 0 l 0 1013 l 140 1013 l 140 126 l 645 126 l 645 0 "}," ":{"ha":375,"o":""},"P":{"ha":806,"o":"m 424 1013 q 640 931 555 1013 q 726 719 726 850 q 637 506 726 587 q 413 426 548 426 l 140 426 l 140 0 l 0 0 l 0 1013 l 424 1013 m 379 889 l 140 889 l 140 548 l 372 548 q 522 589 459 548 q 593 720 593 637 q 528 845 593 801 q 379 889 463 889 "},"T":{"ha":835,"o":"m 777 894 l 458 894 l 458 0 l 319 0 l 319 894 l 0 894 l 0 1013 l 777 1013 l 777 894 "},"1":{"ha":792,"o":"m 574 0 l 442 0 l 442 697 l 215 697 l 215 796 q 386 833 330 796 q 475 986 447 875 l 574 986 l 574 0 "},"W":{"ha":1351,"o":"m 1263 1013 l 995 0 l 859 0 l 627 837 l 405 0 l 265 0 l 0 1013 l 136 1013 l 342 202 l 556 1013 l 701 1013 l 921 207 l 1133 1012 l 1263 1013 "},"I":{"ha":293,"o":"m 180 0 l 41 0 l 41 1013 l 180 1013 l 180 0 "},"G":{"ha":1011,"o":"m 921 0 l 832 0 l 801 136 q 655 15 741 58 q 470 -28 568 -28 q 126 133 259 -28 q 0 499 0 284 q 125 881 0 731 q 486 1043 259 1043 q 763 957 647 1043 q 905 709 890 864 l 772 709 q 668 866 747 807 q 486 926 589 926 q 228 795 322 926 q 142 507 142 677 q 228 224 142 342 q 483 94 323 94 q 712 195 625 94 q 796 435 796 291 l 477 435 l 477 549 l 921 549 l 921 0 "},".":{"ha":239,"o":"m 142 0 l 0 0 l 0 151 l 142 151 l 142 0 "},"A":{"ha":1008,"o":"m 906 0 l 756 0 l 648 303 l 251 303 l 142 0 l 0 0 l 376 1013 l 529 1013 l 906 0 m 610 421 l 452 867 l 293 421 l 610 421 "},"6":{"ha":792,"o":"m 739 312 q 633 62 739 162 q 400 -31 534 -31 q 162 78 257 -31 q 53 439 53 206 q 178 859 53 712 q 441 986 284 986 q 643 912 559 986 q 732 713 732 833 l 601 713 q 544 830 594 786 q 426 875 494 875 q 268 793 331 875 q 193 517 193 697 q 301 597 240 570 q 427 624 362 624 q 643 540 552 624 q 739 312 739 451 m 603 298 q 540 461 603 400 q 404 516 484 516 q 268 461 323 516 q 207 300 207 401 q 269 137 207 198 q 405 83 325 83 q 541 137 486 83 q 603 298 603 197 "},"O":{"ha":1057,"o":"m 485 1041 q 834 882 702 1041 q 958 512 958 734 q 834 136 958 287 q 481 -26 702 -26 q 126 130 261 -26 q 0 504 0 279 q 127 880 0 728 q 485 1041 263 1041 m 480 98 q 731 225 638 98 q 815 504 815 340 q 733 783 815 669 q 480 912 640 912 q 226 784 321 912 q 142 504 142 670 q 226 224 142 339 q 480 98 319 98 "},"3":{"ha":792,"o":"m 737 284 q 635 55 737 141 q 399 -25 541 -25 q 156 52 248 -25 q 54 308 54 140 l 185 308 q 245 147 185 202 q 395 96 302 96 q 539 140 484 96 q 602 280 602 190 q 510 429 602 390 q 324 454 451 454 l 324 565 q 487 584 441 565 q 565 719 565 617 q 515 835 565 791 q 395 879 466 879 q 255 824 307 879 q 203 661 203 769 l 78 661 q 166 909 78 822 q 387 992 250 992 q 603 921 513 992 q 701 723 701 844 q 669 607 701 656 q 578 524 637 558 q 696 434 655 499 q 737 284 737 369 "},"9":{"ha":792,"o":"m 739 524 q 619 94 739 241 q 362 -32 516 -32 q 150 47 242 -32 q 59 244 59 126 l 191 244 q 246 129 191 176 q 373 82 301 82 q 526 161 466 82 q 597 440 597 255 q 363 334 501 334 q 130 432 216 334 q 53 650 53 521 q 134 880 53 786 q 383 986 226 986 q 659 841 566 986 q 739 524 739 719 m 388 449 q 535 514 480 449 q 585 658 585 573 q 535 805 585 744 q 388 873 480 873 q 242 809 294 873 q 191 658 191 745 q 239 514 191 572 q 388 449 292 449 "},"4":{"ha":792,"o":"m 742 243 l 602 243 l 602 0 l 476 0 l 476 243 l 48 243 l 48 368 l 476 958 l 602 958 l 602 354 l 742 354 l 742 243 m 476 354 l 476 792 l 162 354 l 476 354 "}};
