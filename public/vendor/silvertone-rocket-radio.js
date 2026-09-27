// Photo-based Silvertone Model 6110 "Rocket" radio. Millimetres, dial faces +Z, floor Y=0.
export const meta = {
  name: 'Silvertone rocket radio', order: 1,
  description: 'The 1938 Silvertone Model 6110 "Rocket" radio: a Bakelite cylinder on a stacked-slat grille base, six station pushbuttons on top and a domed nose that turns to tune. Photo-based interpretation.',
};
// Nominal station behind each pushbutton, front pair first. The originals were set by the owner.
const BUTTON_STATIONS = [640, 790, 880, 1020, 1170, 1340];
export const params = [
  { id: 'frequency', label: 'Station frequency', type: 'number', group: 'Radio controls', min: 550, max: 1700, step: 10, default: 750, unit: 'kHz', help: 'Turns the domed nose so this station sits over the fixed pointer at six o\'clock. Ignored while a pushbutton is down.' },
  { id: 'pushbutton', label: 'Pushbutton', type: 'select', group: 'Radio controls', default: 'none', options: [{value:'none',label:'None (manual tuning)'},...BUTTON_STATIONS.map((f,i)=>({value:String(i+1),label:`${i+1} · ${f} kHz`}))], help: 'Holds one key down and swings the dome to that key\'s preset station.' },
];
export const presets = [
  {name:'As photographed',params:{frequency:750,pushbutton:'none'}},
  {name:'Bottom of the dial',params:{frequency:550,pushbutton:'none'}},
  {name:'Preset 3 pressed',params:{pushbutton:'3'}},
];
function bounded(p,id) {const spec=params.find(s=>s.id===id);const n=Number(p[id]??spec.default);return Math.max(spec.min,Math.min(spec.max,Number.isFinite(n)?n:spec.default));}
function pressedKey(p) {const k=Number(p.pushbutton);return Number.isInteger(k)&&k>=1&&k<=BUTTON_STATIONS.length?k:0;}
function tuned(p) {const k=pressedKey(p);return k?BUTTON_STATIONS[k-1]:bounded(p,'frequency');}
// Printed dial ticks (tens of kHz) and where each sits on the dome, degrees clockwise from
// twelve o'clock seen from the front, measured off the straight-on photograph. The third field
// marks a numbered tick; the rest are unlabelled. The scale crowds together at the top end.
const MARKS=[[55,234,1],[60,212,1],[65,199],[70,187,1],[75,178],[80,170,1],[90,158,1],[100,147],[110,139,1],[120,130],[130,123,1],[140,117],[150,112,1],[160,107],[170,102,1]];
function markAngle(f) {
  const k=f/10;let i=0;while(i<MARKS.length-2&&k>MARKS[i+1][0])i++;
  const [f0,a0]=MARKS[i],[f1,a1]=MARKS[i+1];return a0+(a1-a0)*(k-f0)/(f1-f0);
}
export function metrics(p) {const k=pressedKey(p);return [
  {label:'Body (W × H × D)',value:'165 × 178 × 292 mm',note:'From the museum label, 7 × 11.5 × 6.5 in (height × depth × width). The pushbutton bank stands 10 mm above the body.'},
  {label:'Reference',value:'Silvertone (Sears) · Model 6110 · c. 1938',note:'The museum card dates it c.1920s, but its own text places the design in the 1930s.'},
  {label:'Tuned',value:tuned(p)+' kHz'+(k?` (pushbutton ${k})`:''),note:'Dome rotation '+(180-markAngle(tuned(p))).toFixed(1)+'°'},
  {label:'Reconstruction',value:'Photo-based',note:'Slat count, dial calibration and pushbutton stations are approximations, not a measured replica.'},
];}
export function build(p) {
  const C={body:0x2a211c,dome:0x171412,hub:0x3a3734,cloth:0x121010,print:0xe9e3d2,key:0x241d19,window:0xc9a04a,metal:0x8a8578};
  const groups=new Map(), parts=[];
  const W=165, D=292, R=74, A=104, TOP=133;   // width, depth, cylinder radius, axis height, top plate
  const DOME_H=42, S=(R*R+DOME_H*DOME_H)/(2*DOME_H), ZC=-S; // spherical cap, apex at z=0
  const f=tuned(p), key=pressedKey(p), turn=(180-markAngle(f))*Math.PI/180;
  function add(name,g,color) {const k=name+':'+color;if(!groups.has(k))groups.set(k,{name,color,gs:[]});groups.get(k).gs.push(g);}
  function rrect(x0,y0,x1,y1,r) {const s=new THREE.Shape();s.moveTo(x0+r,y0);s.lineTo(x1-r,y0);s.quadraticCurveTo(x1,y0,x1,y0+r);s.lineTo(x1,y1-r);s.quadraticCurveTo(x1,y1,x1-r,y1);s.lineTo(x0+r,y1);s.quadraticCurveTo(x0,y1,x0,y1-r);s.lineTo(x0,y0+r);s.quadraticCurveTo(x0,y0,x0+r,y0);return s;}
  // A horizontal slab from a plan outline given as (x, z); rotated so the extrusion runs up Y.
  function slab(name,shape,y,h,color,bevel=.6) {
    const g=new THREE.ExtrudeGeometry(shape,{depth:h-2*bevel,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:4});
    g.rotateX(Math.PI/2);g.translate(0,y+h-bevel,0);add(name,g,color);
  }
  function box(name,x,y,z,w,h,d,color) {const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);add(name,g,color);}
  function planRect(x0,z0,x1,z1,r) {return rrect(x0,z0,x1,z1,r);} // after rotateX(+90°), shape y becomes world z

  // ---- Stacked-slat grille base: ten plates over a dark cloth core. ----
  const REAR=-D, NOTCH=30;
  box('Grille cloth',0,68,-175,W-12,122,228,C.cloth); // encloses the cylinder's rear cap below the top plate
  const pitch=(TOP-7)/9;
  for(let k=0;k<10;k++) {
    const y=k*pitch, h=k===0?10:7, front=[-14,-20][k]??(k===9?-50:-62-(9-k)*1.6); // the base and lowest slat run on under the dome
    const s=new THREE.Shape(), x=W/2, r=3, rn=k>0&&k<9?6:0;
    // Plan outline with a notch at the rear where the centre panel sits between the slat ends.
    s.moveTo(-x+r,REAR);
    if(rn){s.lineTo(-NOTCH,REAR);s.lineTo(-NOTCH,REAR+rn);s.lineTo(NOTCH,REAR+rn);s.lineTo(NOTCH,REAR);}
    s.lineTo(x-r,REAR);s.quadraticCurveTo(x,REAR,x,REAR+r);s.lineTo(x,front-r);s.quadraticCurveTo(x,front,x-r,front);
    s.lineTo(-x+r,front);s.quadraticCurveTo(-x,front,-x,front-r);s.lineTo(-x,REAR+r);s.quadraticCurveTo(-x,REAR,-x+r,REAR);
    slab(k===9?'Top plate':k===0?'Base plate':'Grille slats',s,y,h,C.body);
    // Each slat above the base ends in a small raised tab on either side, just short of the front.
    if(k>1)for(const sx of [-1,1])box('Slat end tabs',sx*(x+.8),y+h/2+.5,front+6,2.6,h+1,8,C.body);
  }
  // Rear centre panel with the interlock plug pins seen in the rear photograph.
  box('Rear centre panel',0,68,REAR+3.5,2*NOTCH-1,118,5,C.body);
  for(const x of [-6,6])box('Interlock pins',x,20,REAR+.5,1.4,8,6,C.metal);
  box('Interlock boss',0,20,REAR+1.5,24,14,3,C.body);
  // Neck between the slats and the dial collar.
  box('Neck',0,80,-56,100,92,14,C.body);

  // ---- The cylinder: exposed above the top plate as the hood, and ahead of the base. ----
  const cyl=new THREE.CylinderGeometry(R,R,D-50,72,1,true);cyl.rotateX(Math.PI/2);cyl.translate(0,A,REAR+4+(D-50)/2);add('Cylinder shell',cyl,C.body);
  const cap=new THREE.CircleGeometry(R,72);cap.rotateY(Math.PI);cap.translate(0,A,REAR+4);add('Cylinder rear cap',cap,C.body);
  const lipFrom=Math.asin((TOP-A)/(R-1.5)), lip=new THREE.TorusGeometry(R-1.5,2.2,8,48,Math.PI-2*lipFrom);lip.rotateZ(lipFrom);lip.translate(0,A,REAR+4);add('Cylinder rear lip',lip,C.body); // only the arch above the top plate shows
  const collar=new THREE.CylinderGeometry(R+2,R+2,8,72);collar.rotateX(Math.PI/2);collar.translate(0,A,-46);add('Dial collar',collar,C.body);
  const bead=new THREE.TorusGeometry(R+.5,2.4,10,72);bead.translate(0,A,-42.5);add('Dial collar',bead,C.body);
  // Fixed pointer rising from the lowest slat at six o'clock, just clear of the dome's underside.
  const ptrSolid=new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-3.5,0),new THREE.Vector2(3.5,0),new THREE.Vector2(0,6)]),{depth:5,bevelEnabled:false});
  ptrSolid.translate(0,21,-36);add('Tuning pointer',ptrSolid,C.print);

  // ---- The domed nose. Built about its own axis, then turned to the station and mounted. ----
  const dome=[];
  const onSphere=(x,y,lift=.3)=>ZC+Math.sqrt(Math.max(0,(S+lift)**2-x*x-y*y));
  const polar=(a,r)=>[r*Math.sin(a),r*Math.cos(a)];
  const psiMax=Math.asin(R/S), prof=[];
  for(let i=0;i<=20;i++){const psi=psiMax*i/20;prof.push(new THREE.Vector2(Math.max(1e-4,S*Math.sin(psi)),ZC+S*Math.cos(psi)));}
  const shell=new THREE.LatheGeometry(prof.reverse(),72);shell.rotateX(Math.PI/2);dome.push(['Rotating dial dome',shell,C.dome]);
  function strand(name,pts,r,color) {
    const path=new THREE.CatmullRomCurve3(pts.map(([x,y])=>new THREE.Vector3(x,y,onSphere(x,y,.35))));
    dome.push([name,new THREE.TubeGeometry(path,Math.max(4,pts.length*2),r,4,false),color]);
  }
  // Text draped onto the sphere at angle a. 'outward' stands letters with their tops to the rim,
  // reading clockwise; 'radial' runs the text outward along the radius, tops anticlockwise.
  function ring(name,text,a,rad,size,color,mode='outward') {
    const scale=size/1000;let cursor=-[...text].reduce((n,c)=>n+(GLYPHS[c]?.ha||350),0)*scale/2;const shapes=[];
    for(const c of text){const gl=GLYPHS[c];if(!gl){cursor+=350*scale;continue;}const path=new THREE.ShapePath(),t=(gl.o||'').split(' ');let i=0;
      const pt=()=>[Number(t[i++])*scale+cursor,Number(t[i++])*scale-size*.36];
      while(i<t.length){const op=t[i++];if(op==='m')path.moveTo(...pt());else if(op==='l')path.lineTo(...pt());else if(op==='q'){const e=pt(),cp=pt();path.quadraticCurveTo(...cp,...e);}else if(op==='b'){const e=pt(),c1=pt(),c2=pt();path.bezierCurveTo(...c1,...c2,...e);}}
      shapes.push(...path.toShapes());cursor+=gl.ha*scale;}
    if(!shapes.length)return;
    const g=new THREE.ShapeGeometry(shapes,3), pos=g.getAttribute('position'), sa=Math.sin(a), ca=Math.cos(a), cx=rad*sa, cy=rad*ca;
    const [rx,ry,ux,uy]=mode==='radial'?[sa,ca,-ca,sa]:[ca,-sa,sa,ca];
    for(let i=0;i<pos.count;i++){const u=pos.getX(i),v=pos.getY(i),x=cx+u*rx+v*ux,y=cy+u*ry+v*uy;pos.setXYZ(i,x,y,onSphere(x,y,.45));}
    g.computeVertexNormals();dome.push([name,g,color]);
  }
  const deg=Math.PI/180;
  const word='SILVERTONE';
  // SILVERTONE spans nine o'clock over the top to three o'clock.
  for(let i=0;i<word.length;i++)ring('Dome lettering',word[i],(-94+i*19.7)*deg,R-14,6.5,C.print);
  // Straight ticks running in from the rim, with the numerals printed along the tick line inside them.
  for(const [k,a,numbered] of MARKS) {
    strand('Dial scale',[polar(a*deg,R-(numbered?13:11)),polar(a*deg,R-2.5)],.32,C.print);
    if(numbered)ring('Dial numerals',String(k),a*deg,R-19.5,4,C.print,'radial');
  }
  // Round hub at the apex with a raised grip bar across it.
  const hubR=12, hubZ=ZC+Math.sqrt(S*S-hubR*hubR);
  const hub=new THREE.CylinderGeometry(hubR,hubR,1.4-hubZ,40);hub.rotateX(Math.PI/2);hub.translate(0,0,(hubZ+1.4)/2-.4);dome.push(['Dial hub',hub,C.hub]);
  const hubRim=new THREE.TorusGeometry(hubR,.7,8,40);hubRim.translate(0,0,1);dome.push(['Dial hub rim',hubRim,C.dome]);
  const grip=new THREE.BoxGeometry(3.6,17,2.6);grip.rotateZ(-17*deg);grip.translate(0,0,2.2);dome.push(['Dial grip bar',grip,0x2a2320]);
  for(const [name,g,color] of dome){g.rotateZ(-turn);g.translate(0,A,0);add(name,g,color);}

  // ---- Pushbutton bank on the crown of the cylinder, two keys across and three deep. ----
  const padTop=A+R+4, padZ0=-128, padZ1=-48;
  slab('Pushbutton escutcheon',planRect(-31,padZ0,31,padZ1,4),A+R-12,16,C.body,1);
  box('Pushbutton well',0,padTop+.1,(padZ0+padZ1)/2,52,.4,70,C.cloth);
  let n=0;
  for(const zc of [-62,-88,-114])for(const xc of [-13.5,13.5]) {
    n++;const down=n===key?4.5:0, y=padTop-2-down;
    slab('Pushbuttons',planRect(xc-11,zc-10,xc+11,zc+10,2),y,8,C.key,.8);
    box('Station label windows',xc,y+8.05,zc,15,.3,10,C.window);
    for(const dz of [-6,6])box('Station label frames',xc,y+8.12,zc+dz,17,.4,1.2,0x3a302a);
  }

  for(const {name,color,gs} of groups.values()) {
    const glossy=name.includes('dome')||name.includes('Dome')||name.includes('Dial');
    parts.push({name,color,geometry:merge(gs),roughness:glossy?.18:name.includes('cloth')||name.includes('well')?.95:.45});
  }
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
