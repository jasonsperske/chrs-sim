// Photo-based RCA Victor GGIE radio. Millimetres, front +Z, floor Y=0.
export const meta = {
  name: 'GGIE radio', order: 1,
  description: 'The 1939 RCA Victor Golden Gate International Exposition radio: a walnut cabinet, sculpted bridge and Tower of the Sun, woven grille and amber tuning dial. Photo-based interpretation with working control poses.',
};
export const params = [
  { id: 'power', label: 'Power', type: 'select', group: 'Radio controls', default: 'on', options: [{value:'on',label:'On'},{value:'off',label:'Off'}], help: 'Poses the left knob at its off detent. The set has no dial lamp, so the dial looks the same on or off.' },
  { id: 'frequency', label: 'Station frequency', type: 'number', group: 'Radio controls', min: 550, max: 1700, step: 10, default: 900, unit: 'kHz', help: 'Moves the dial pointer and right tuning knob. Scale follows the photographed markings; intermediate calibration is approximate.' },
  { id: 'volume', label: 'Volume', type: 'number', group: 'Radio controls', min: 0, max: 100, step: 1, default: 45, unit: '%', help: 'Rotates the left knob while powered. Control assignment is inferred; no audio is generated.' },
];
export const presets = [
  {name:'On display',params:{power:'off',frequency:900,volume:45}},
  {name:'Evening broadcast',params:{power:'on',frequency:1050,volume:65}},
];
function bounded(p,id) {const spec=params.find(s=>s.id===id);const n=Number(p[id]??spec.default);return Math.max(spec.min,Math.min(spec.max,Number.isFinite(n)?n:spec.default));}
export function metrics(p) {return [
  {label:'Cabinet (W × H × D)',value:'234.95 × 152.4 × 146.05 mm',note:'Interprets the museum label as height × width × depth; handle extends above the cabinet.'},
  {label:'Reference',value:'RCA Victor · GGIE · 1939'},
  {label:'Station',value:bounded(p,'frequency')+' kHz'},
  {label:'Reconstruction',value:'Photo-based',note:'Relief artwork and control calibration are approximations, not a measured replica.'},
];}
export function build(p) {
  const C={wood:0x694022,edge:0x42271a,relief:0x8a5b33,shadow:0x39271c,ivory:0xd8bd86,cloth:0x4b3725,metal:0x736c52};
  const groups=new Map(), parts=[];
  let legendName='Printed legends';
  const on=(p.power??'on')==='on', frequency=bounded(p,'frequency'), volume=bounded(p,'volume');
  function add(name, g, color) { const key = name + ':' + color; if (!groups.has(key)) groups.set(key, { name, color, gs: [] }); groups.get(key).gs.push(g); }
  function block(name, x,y,z,w,h,d,color,r=0) {
    let g;
    if (r) {
      const s = new THREE.Shape(), a=-w/2,b=-h/2;
      s.moveTo(a+r,b); s.lineTo(a+w-r,b); s.quadraticCurveTo(a+w,b,a+w,b+r); s.lineTo(a+w,b+h-r); s.quadraticCurveTo(a+w,b+h,a+w-r,b+h); s.lineTo(a+r,b+h); s.quadraticCurveTo(a,b+h,a,b+h-r); s.lineTo(a,b+r); s.quadraticCurveTo(a,b,a+r,b);
      g = new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:0.6,bevelThickness:0.6,bevelSegments:2,steps:1,curveSegments:5}); g.translate(x,y,z-d/2);
    } else { g = new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); }
    add(name,g,color);
  }
  function disc(name,x,y,z,r,d,color,r2=r) { const g = new THREE.CylinderGeometry(r2,r,d,24); g.rotateX(Math.PI/2); g.translate(x,y,z); add(name,g,color); }
  function torus(name,x,y,z,r,t,color) { const g = new THREE.TorusGeometry(r,t,8,32); g.translate(x,y,z); add(name,g,color); }
  function line(name,a,b,r,color) { const v = new THREE.Vector3(...a), w = new THREE.Vector3(...b), delta = w.clone().sub(v); const g=new THREE.CylinderGeometry(r,r,delta.length(),6); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())); g.translate(...v.add(w).multiplyScalar(.5).toArray()); add(name,g,color); }
  function label(text,x,y,size=4,z=5,color=C.ivory) {
    const scale=size/1000; let cursor = -[...text].reduce((n,c)=>n+(GLYPHS[c]?.ha || 350),0)*scale/2;
    const shapes=[];
    for (const c of text) { const gl=GLYPHS[c]; if (!gl) continue; const path=new THREE.ShapePath(), t=(gl.o || '').split(' '); let i=0;
      const pt=()=>[Number(t[i++])*scale+cursor,Number(t[i++])*scale];
      while(i<t.length) { const op=t[i++]; if(op==='m') path.moveTo(...pt()); else if(op==='l') path.lineTo(...pt()); else if(op==='q') {const end=pt(),cp=pt();path.quadraticCurveTo(...cp,...end)} else if(op==='b') {const end=pt(),cp1=pt(),cp2=pt();path.bezierCurveTo(...cp1,...cp2,...end)} }
      shapes.push(...path.toShapes()); cursor+=gl.ha*scale;
    }
    if(shapes.length) {const g=new THREE.ShapeGeometry(shapes,3);g.translate(x,y,z+1.5);add(legendName,g,color)}
  }

  function shape(points) {const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
  function panel(name,s,z,depth,color,bevel=.3) {const g=new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:12});g.translate(0,0,z);add(name,g,color);}
  function curve(name,points,r,color) {
    const path=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));
    // Choose the fewest longitudinal segments that keep chord error below
    // 0.05 mm (and below half the strand radius). Retain six radial sides
    // for the original rounded highlights; large bridge curves stay smooth.
    const tolerance=Math.min(.05,r*.5);
    let segments=4;
    for(;segments<32;segments*=2) {
      let acceptable=true;
      for(let i=0;i<segments && acceptable;i++) {
        const start=path.getPointAt(i/segments), end=path.getPointAt((i+1)/segments);
        const chord=new THREE.Line3(start,end);
        for(const fraction of [.25,.5,.75]) {
          const point=path.getPointAt((i+fraction)/segments);
          if(point.distanceTo(chord.closestPointToPoint(point,true,new THREE.Vector3()))>tolerance) {acceptable=false;break;}
        }
      }
      if(acceptable)break;
    }
    add(name,new THREE.TubeGeometry(path,segments,r,6,false),color);
  }
  function rect(x,y,w,h,r=2) {const s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
  // Hollow cabinet: the vent holes open into a dark interior, not a solid block.
  block('Walnut sides',-114,79,-73,7,143,146,C.wood,1);
  block('Walnut sides',114,79,-73,7,143,146,C.wood,1);
  block('Walnut top',0,148.5,-73,230,7,146,C.wood,2);
  block('Cabinet floor',0,11,-73,224,7,143,C.edge);
  for(const x of [-99,99])for(const z of [-13,-132]) {
    block('Stepped feet',x,2,z,33,4,25,C.edge,1);
    block('Stepped feet',x,5,z,30,3,23,C.wood,1);
  }
  for(let i=0;i<3;i++)block('Front base molding',0,6+i*2.5,1,237-i*2,2.4,11-i,C.edge,1);
  const handle=shape([[-49,152],[-56,176], [56,176],[49,152],[30,152],[32,167],[-32,167],[-30,152]]);
  panel('Trapezoidal carrying handle',handle,-80,12,C.wood,.8);
  for(const z of [-78,-70])line('Handle grooves',[-52,176.8,z],[52,176.8,z],.25,C.edge);
  // Subtle deterministic veneer grain, lying against both side walls and top.
  for(let i=0;i<80;i++) {
    const z=-5-i*1.72, wave=Math.sin(i*2.71);
    for(const x of [-117.55,117.55])curve('Veneer grain',[[x,16,z],[x,55,z+wave*.6],[x,105,z-wave*.6],[x,146,z]],.09,i%3?0x624023:0x77502c);
    curve('Top veneer grain',[[-111,152.65,z],[-35,152.65,z+wave],[45,152.65,z-wave],[111,152.65,z]],.08,0x76502f);
  }
  const fascia=rect(-116,14,232,135,5);
  const grille=rect(-91,48,88,77,6);
  fascia.holes.push(new THREE.Path(grille.getPoints(16)));
  const dialHole=rect(34,56,50,65,4);
  fascia.holes.push(new THREE.Path(dialHole.getPoints(16)));
  panel('Sculpted Bakelite fascia',fascia,-3,5,C.wood,.7);
  // Woven grille behind the opening: horizontal threads, paired vertical stitches.
  block('Grille shadow',-47,86,-2.8,88,77,1,C.shadow);
  for(let y=50;y<124;y+=2.4)line('Grille weft',[-90,y,-1.4],[-4,y,-1.4],.38,0x9a7c4d);
  for(let x=-89;x<-4;x+=2.4)for(let y=50;y<123;y+=4.8) {
    line('Woven grille stitches',[x,y,-1],[x,y+2.7,-.5],.44,0xb39460);
    line('Woven grille stitches',[x+.65,y+2.5,-1.4],[x+.65,y+4.7,-1.4],.3,0x795c38);
  }
  // Raised Tower of the Sun with stepped shafts and a flared base.
  panel('Tower of the Sun',shape([[-106,24],[-99,24],[-96,53],[-99,102],[-101,137],[-102,143],[-104,137],[-105,102],[-110,53]]),2,2.4,C.relief);
  for(const x of [-107,-103,-99])line('Tower recessed shafts',[x,39,5],[x*.98,102,5],.55,C.shadow);
  block('Tower crown',-102.5,142,4,2.3,5,3,C.relief,.4);
  for(let i=0;i<4;i++)block('Tower base steps',-102,25+i*2,4,16-i*2,2,3,C.relief,.2);
  // Pavilion buildings at the tower base.
  for(let i=0;i<9;i++) {
    const x=-84+i*6, h=8+8*(.5+.5*Math.sin(i*2.4));
    block('Exposition pavilion',x,27+h/2,4.4,5,h,2.8,C.relief,.3);
    line('Pavilion shadow', [x-1,28,6],[x-1,26+h,6],.35,C.shadow);
  }
  block('South Tower',-64,43,5,8,25,4,C.relief,.6);
  block('South Tower crown',-64,57,5,6,3,4,C.edge,.7);
  // Bridge towers, lattice, suspension cables and hangers.
  const deckY=x=>33+(x+36)*.105;
  for(const [x,top] of [[-8,82],[108,94]]) {
    panel('Golden Gate bridge towers',shape([[x-4,deckY(x)-4],[x-2,top],[x+2,top],[x+4,deckY(x)-4]]),3.5,2,C.relief);
    line('Bridge tower recess',[x,deckY(x),6],[x,top-3,6],.8,C.shadow);
    for(let y=deckY(x)+2;y<top-5;y+=6) {
      line('Tower lattice',[x-1.8,y,6.3],[x+1.8,y+5,6.3],.32,C.relief);
      line('Tower lattice',[x+1.8,y,6.3],[x-1.8,y+5,6.3],.32,C.relief);
    }
    disc('Bridge finials',x,top+1,5,1.5,2,C.relief);
  }
  // Piecewise parabola gives a gently sagging main span and descending left approach.
  const cy=x=>x<-8?36+46*((x+52)/44)**2:43+39*((x-47)/55)**2;
  const cable=[];
  for(let x=-52;x<=108;x+=2) cable.push([x,cy(x),6]);
  curve('Main suspension cable',cable,1.1,C.relief);
  for(let x=-48;x<107;x+=5) if(cy(x)>deckY(x))line('Suspension hangers',[x,deckY(x),4.8],[x,cy(x),4.8],.48,C.relief);
  line('Bridge deck',[-52,deckY(-52),6],[110,deckY(110),6],1.25,C.relief);
  // Low relief water bands and fan palms, kept geometric for export.
  for(let row=0;row<4;row++) {
    const points=[];for(let x=-112;x<=112;x+=8)points.push([x,17+row*2.5+Math.sin(x*.07+row)*1.2,3.2]);
    curve('Water relief',points,.45,C.relief);
  }
  for(const [x,y] of [[-112,28],[-88,28],[-74,26],[-46,29]]) {
    line('Palm trunks',[x,y,6],[x,y+5,6],.45,C.relief);
    for(let k=0;k<7;k++){const a=k*Math.PI/3.5;curve('Palm fronds',[[x,y+5,6],[x+Math.cos(a)*3,y+5+Math.sin(a)*3,6.5],[x+Math.cos(a)*5,y+3+Math.sin(a)*4,6]],.35,C.relief);}
  }
  label('GOLDEN GATE INTERNATIONAL EXPOSITION',0,137,4.2,3,C.shadow);
  label('TOWER OF THE SUN',-77,19,2.5,3.8,C.shadow);
  label('GOLDEN GATE BRIDGE',15,22,2.5,3.8,C.shadow);
  // Amber dial and art-deco printed lines. Frequency interpolates between observed labels.
  // There is no dial lamp: the scale is unlit and unchanged by power.
  panel('Amber tuning scale',rect(34,56,50,65,4),-1.3,1,0x99542e,0);
  const marks=[550,650,700,800,900,1050,1250,1400,1700];
  const angles=marks.map((_,i)=>Math.PI-(i/(marks.length-1))*Math.PI);
  for(let i=0;i<marks.length;i++)label(String(marks[i]/10),59+Math.cos(angles[i])*20,89+Math.sin(angles[i])*24,3.3,-.1,C.ivory);
  const arch=[];for(let i=0;i<=32;i++){const a=Math.PI*i/32;arch.push([59+Math.cos(a)*14,88+Math.sin(a)*19,.6]);}curve('Dial printed arch',arch,.25,C.ivory);
  for(const x of [38,39.5,41,45,52,55,63,66,73,77,78.5,80])line('Dial printed lines',[x,58,.6],[x,x<45||x>73?84:78,.6],.18,C.ivory);
  torus('RCA dial medallion',59,85,.65,6.5,.3,C.ivory);label('RCA',59,83,3.9,-.8,C.ivory);
  for(let i=0;i<6;i++)label('VICTOR'[i],59,76-i*2.8,2.2,-.8,C.ivory);
  let interval=0;while(interval<marks.length-2&&frequency>marks[interval+1])interval++;
  const t=(frequency-marks[interval])/(marks[interval+1]-marks[interval]);
  const a=angles[interval]+(angles[interval+1]-angles[interval])*t;
  line('Tuning needle',[59+Math.cos(a)*7,85+Math.sin(a)*7,1.2],[59+Math.cos(a)*16,85+Math.sin(a)*21,1.2],.25,0xeee0b6);
  function knob(name,x,angle) {
    disc(name+' base',x,34,7,6,5,C.edge);
    disc(name,x,34,10,6.2,6,C.ivory,5.4);
    for(let i=0;i<12;i++){const a=angle+i*Math.PI/6;line(name+' flutes',[x+Math.cos(a)*5.8,34+Math.sin(a)*5.8,8],[x+Math.cos(a)*5.1,34+Math.sin(a)*5.1,13],.55,0xb59962);}
    line(name+' index',[x+Math.sin(angle)*3.6,34+Math.cos(angle)*3.6,13.15],[x+Math.sin(angle)*5,34+Math.cos(angle)*5,13.15],.3,C.shadow);
  }
  knob('Power and volume knob',48,on?(-2.1+volume/100*4.2):-2.55);
  knob('Tuning knob',77,-2.3+(frequency-550)/1150*4.6);
  // Rear hardboard with ten open vents and a simple shadowed chassis behind them.
  const back=rect(-109,17,218,127,1);
  for(const y of [58,110])for(const x of [-78,-39,0,39,78]){const h=new THREE.Path();h.absarc(x,y,10,0,Math.PI*2,true);back.holes.push(h);}
  panel('Perforated rear panel',back,-146,2.4,0x302d24,0);
  block('Internal chassis',0,33,-103,183,4,62,0x4b4433);
  for(const x of [-66,-22,28,65]){const g=new THREE.CylinderGeometry(7,8,28,16);g.translate(x,49,-110);add('Valve silhouettes',g,0x494237);}
  // Rear-facing details constructed in local front coordinates then flipped outward.
  legendName='Rear legends';
  const before=new Map([...groups].map(([key,value])=>[key,value.gs.length]));
  for(const x of [-102,102])for(const y of [23,138]){disc('Rear screws',x,y,0,2.6,1,C.metal);line('Rear screw slots',[x-1.5,y-.6,1],[x+1.5,y+.6,1],.25,C.shadow);}
  disc('Inspection seal',19,84,0,9,.3,0xb28b38);label('UL',19,81,6,-.5,C.shadow);
  label('RCA VICTOR',47,33,5,0,0xa59f88);label('RCA MFG CO  CAMDEN NJ',41,23,2,0,0xa59f88);
  label('PHONO',-51,34,2.6,0,0xa59f88);torus('Phono socket',-51,26,1,2.5,.8,C.metal);
  block('Antenna terminal board',-11,29,.6,24,12,2,0x5f4528,1);
  label('ANT',-11,33,2.3,1,0xa59f88);disc('Antenna terminal',-11,28,2,2.5,2,C.metal);
  for(const [key,group] of groups){const start=before.get(key)??0;for(let i=start;i<group.gs.length;i++){group.gs[i].rotateY(Math.PI);group.gs[i].translate(0,0,-146.3);}}
  for(const {name,color,gs} of groups.values())parts.push({name,color,geometry:merge(gs),roughness:name.includes('Walnut')?.42:.75,...(name==='Printed legends'?{lod:{surface:'z'}}:{})});
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
