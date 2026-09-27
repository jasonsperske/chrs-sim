// Photo-based field radio. Millimetres; +Y up, front +Z. Fixed estimated dimensions.
// Labels are vector geometry, so they survive exports without textures.
export const meta = {
  name: 'Field radio', order: 0,
  description: 'A photo-based 1940s US Navy transmitter-receiver, catalogued by its museum as CRI-43044/TS-141VP and shown in its Navajo Code Talkers exhibit. Olive-drab aluminium case with an analog meter, mechanical tuning wheels, battery box, cables and canvas carrying straps. Dimensions are estimated from the reference photographs.',
}
// Control meanings checked against Introduction to Radio Equipment, chapter 22:
// https://www.maritime.org/doc/radio/chap22.php (TBY controls, pp. 300–303).
const onOff = [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }];
const bands = [1,2,3,4].map(n => ({ value: String(n), label: 'Band ' + n }));
const locks = [{ value: 'released', label: 'Released' }, { value: 'locked', label: 'Locked' }];
const meterModes = [
  { value: 'audio', label: 'Audio filament voltage' },
  { value: 'plate', label: 'Transmitter plate current' },
  { value: 'rf', label: 'RF filament voltage' },
];
function dial(id, label, group, value, help) {
  return { id, label, group, type: 'number', min: 0, max: 100, step: 1, default: value, unit: '%', help };
}
export const params = [
  { id: 'power', label: 'Power', group: 'Power and lighting', type: 'select', default: 'on', options: onOff },
  { id: 'supplyPower', label: 'Lower power-supply switch', group: 'Power and lighting', type: 'select', default: 'on', options: onOff, help: 'Separate ON–OFF toggle on the lower enclosure. Both power switches must be on for the simulated meter.' },
  { id: 'lightPressed', label: 'Light button held', group: 'Power and lighting', type: 'boolean', default: false, help: 'Poses the LIGHT button depressed and illuminates the dial while powered. Momentary action inferred from the photo.' },
  { id: 'receiverBand', label: 'Receiver band', group: 'Receiver', type: 'select', default: '1', options: bands, help: 'RECEIVER BAND: four coarse tuning positions. Band boundaries require the original calibration card; this selector is posed independently of frequency.' },
  { id: 'receiverLock', label: 'Receiver tuning lock', group: 'Receiver', type: 'select', default: 'released', options: locks, help: 'Right LOCK knob. Release to expose the frequency adjustment; locking retains its setting.' },
  { id: 'frequency', label: 'Station frequency', group: 'Receiver', type: 'number', min: 28, max: 80, step: 0.01, default: 38, unit: 'MHz', visibleWhen: p => p.receiverLock !== 'locked', help: 'RECEIVER TUNING: moves the right tuning wheel and cursor. Linear visual mapping, not original dial calibration.' },
  dial('receiverAntenna', 'Receiver antenna tuning', 'Receiver', 50, 'REC ANT TUNING: adjustment of the receiver input circuit.'),
  dial('volume', 'Volume', 'Receiver', 50, 'VOLUME: headphone audio level. Changes the knob position; no audio is generated.'),
  dial('regeneration', 'Regeneration', 'Receiver', 45, 'REGEN: detector feedback adjustment.'),
  { id: 'transmitterBand', label: 'Transmitter band', group: 'Transmitter', type: 'select', default: '1', options: bands, help: 'TRANS BAND: four coarse tuning positions, separate from the receiver.' },
  { id: 'transmitterLock', label: 'Transmitter tuning lock', group: 'Transmitter', type: 'select', default: 'released', options: locks, help: 'Left LOCK knob. Release to expose transmitter tuning.' },
  { ...dial('transmitterTuning', 'Transmitter tuning', 'Transmitter', 28, 'TRANS TUNING: left vernier wheel. Percentage of modeled dial travel, not a calibrated frequency.'), visibleWhen: p => p.transmitterLock !== 'locked' },
  dial('transmitterLoading', 'Transmitter antenna loading', 'Transmitter', 50, 'TRANS ANT LOADING: adjusts the transmitter antenna circuit.'),
  { id: 'crystal', label: 'Crystal calibrator', group: 'Transmitter', type: 'select', default: 'off', options: onOff, help: 'CRYSTAL: switches the internal calibration reference into the circuit. Poses the toggle; does not lock the station to a frequency.' },
  { id: 'meterMode', label: 'Meter switch', group: 'Meter and filaments', type: 'select', default: 'audio', options: meterModes, help: 'Center knob below the meter: audio voltage (left), transmitter current (center), or RF voltage (right). Needle response is illustrative, not an electrical measurement.' },
  dial('audioFilament', 'Audio filament rheostat', 'Meter and filaments', 50, 'AUDIO FIL RHEOSTAT: adjusts audio-tube heater voltage. The modeled meter follows this control in Audio mode.'),
  dial('rfFilament', 'RF filament rheostat', 'Meter and filaments', 50, 'RF FIL RHEOSTAT: adjusts RF-tube heater voltage. The modeled meter follows this control in RF mode.'),
]
function value(p,id) { return p[id] ?? params.find(spec => spec.id === id)?.default }
function position(p,id) { const n=Number(value(p,id)); return Math.max(0,Math.min(100,Number.isFinite(n)?n:50))/100 }
function frequency(p) { const n=Number(value(p,'frequency')); return Math.max(28,Math.min(80,Number.isFinite(n)?n:38)) }
export function metrics(p) {
  const active = value(p,'power') === 'on' && value(p,'supplyPower') === 'on';
  return [
    { label: 'Power', value: active ? 'On' : 'Off' },
    { label: 'Tuned to', value: frequency(p).toFixed(2) + ' MHz' },
    { label: 'Meter circuit', value: meterModes.find(m => m.value === value(p,'meterMode'))?.label || 'Audio filament voltage', note: 'Illustrative needle response; transmitter current rests at zero (no send control modeled).' },
    { label: 'Cabinet (estimated)', value: '400 × 520 × 230 mm', note: 'Estimated from the photographs. The museum card lists 8 × 11 × 7 in, which does not match the modelled set and is not applied.' },
    { label: 'Reference', value: 'CRI-43044/TS-141VP · 1940s', note: 'Museum catalogue name, from the Navajo Code Talkers exhibit card.' },
  ]
}

export function build(p) {
  const on = value(p,'power') === 'on' && value(p,'supplyPower') === 'on';
  const lit = on && value(p,'lightPressed'), tune = (frequency(p)-28)/52;
  const txTune = position(p,'transmitterTuning');
  const angle = id => -Math.PI*.75 + position(p,id)*Math.PI*1.5;
  const meter = value(p,'meterMode');
  const parts = [], groups = new Map();
  const C = { olive: 0x45483a, panel: 0x55594a, trim: 0x383d35, black: 0x202322, rim: 0x303530, metal: 0x95917a, cream: 0xd6cfab, brass: 0x998257, canvas: 0xa08b59, dark: 0x141c19 };
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
  function disc(name,x,y,z,r,d,color,r2=r) { const g = new THREE.CylinderGeometry(r2,r,d,48); g.rotateX(Math.PI/2); g.translate(x,y,z); add(name,g,color); }
  function torus(name,x,y,z,r,t,color) { const g = new THREE.TorusGeometry(r,t,8,64); g.translate(x,y,z); add(name,g,color); }
  function line(name,a,b,r,color) { const v = new THREE.Vector3(...a), w = new THREE.Vector3(...b), delta = w.clone().sub(v); const g=new THREE.CylinderGeometry(r,r,delta.length(),6); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())); g.translate(...v.add(w).multiplyScalar(.5).toArray()); add(name,g,color); }
  function label(text,x,y,size=4,z=5,color=C.cream) {
    const scale=size/1000; let cursor = -[...text].reduce((n,c)=>n+(GLYPHS[c]?.ha || 350),0)*scale/2;
    const shapes=[];
    for (const c of text) { const gl=GLYPHS[c]; if (!gl) continue; const path=new THREE.ShapePath(), t=(gl.o || '').split(' '); let i=0;
      const pt=()=>[Number(t[i++])*scale+cursor,Number(t[i++])*scale];
      while(i<t.length) { const op=t[i++]; if(op==='m') path.moveTo(...pt()); else if(op==='l') path.lineTo(...pt()); else if(op==='q') {const end=pt(),cp=pt();path.quadraticCurveTo(...cp,...end)} else if(op==='b') {const end=pt(),cp1=pt(),cp2=pt();path.bezierCurveTo(...cp1,...cp2,...end)} }
      shapes.push(...path.toShapes()); cursor+=gl.ha*scale;
    }
    if(shapes.length) {const g=new THREE.ShapeGeometry(shapes,3);g.translate(x,y,z+1.5);add('Engraved ivory legends',g,color)}
  }
  function screw(x,y,z=6) {disc('Panel screws',x,y,z,3.1,1.7,C.metal); const g=new THREE.BoxGeometry(4.7,.65,.3);g.rotateZ(-.65);g.translate(x,y,z+1);add('Screw slots',g,C.dark)}
  function knob(x,y,r=12,angle=.3,z=13,name='Control') {
    disc('Control bases',x,y,7,r+2,6,C.rim);disc('Bakelite knobs',x,y,z,r,14,C.black,r*.88);
    for(let i=0;i<36;i++){const a=i*Math.PI/18;line('Knurled grips',[x+Math.cos(a)*r,y+Math.sin(a)*r,z-5],[x+Math.cos(a)*r*.9,y+Math.sin(a)*r*.9,z+6],.42,C.rim)}
    const g=new THREE.SphereGeometry(r*.86,24,12);g.scale(1,1,.22);g.translate(x,y,z+7);add('Rounded knob faces',g,C.black);
    line(name+' pointer',[x+Math.sin(angle)*r*.7,y+Math.cos(angle)*r*.7,z+8],[x+Math.sin(angle)*r,y+Math.cos(angle)*r,z+8],.8,C.metal);
  }
  function ticks(x,y,r,start,end,count,z=5,color=C.cream) {for(let i=0;i<=count;i++){const a=start+(end-start)*i/count;line('Calibration marks',[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(a)*(r+(i%5===0?4:2.4)),y+Math.sin(a)*(r+(i%5===0?4:2.4)),z],.55,color)}}
  function cable(name,points,r,color) {const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));add(name,new THREE.TubeGeometry(curve,80,r,10,false),color);return curve}
  // Folded steel case and separate battery compartment.
  block('Receiver enclosure',0,343,-111,400,344,230,C.olive,5);
  block('Battery enclosure',0,83,-108,391,162,223,C.olive,4);
  block('Battery lid seam',0,164,-108,398,5,228,C.dark,2);
  block('Recessed front panel',0,338,3,380,330,3,C.panel,2);
  block('Top protective lip',0,513,-106,409,20,246,C.trim,3);
  block('Lower protective lip',0,172,10,409,25,22,C.trim,2);
  for(const x of [-196,196]) block('Panel edge rails',x,344,7,8,325,11,C.trim,2);
  for(const x of [-161,161]) block('Rubber feet',x,3.6,-110,38,6,180,C.black,2);
  for(const x of [-184,184]) for(const y of [191,330,480]) screw(x,y);
  for(const x of [-148,-72,70,147]) {screw(x,497);screw(x,230)}
  // Recessed analog meter, with a scalloped lower cover and raised black bezel.
  disc('Meter mounting flange',0,440,9,49,8,C.rim);torus('Meter outer rolled rim',0,440,15,44,3,C.black);
  disc('Meter dial',0,443,15,39,2,lit?0xd8c897:0x7c8171);
  ticks(0,420,51,.28,Math.PI-.28,30,17,C.dark);
  block('Meter reference square',0,469,17.8,4,4,.3,C.cream);
  // Filament controls drive a normalized illustrative deflection. No send mode
  // is modeled, so the transmitter plate circuit reads zero in receive.
  const reading = meter === 'audio' ? position(p,'audioFilament') : meter === 'rf' ? position(p,'rfFilament') : 0;
  const needleAngle = on ? 2.77-reading*2.4 : 2.77;
  line('Meter needle',[0,422,19],[Math.cos(needleAngle)*48,422+Math.sin(needleAngle)*48,19],.55,on?C.black:0x3d443c);
  disc('Needle pivot',0,422,20,3,2,C.dark);
  const cover=new THREE.Shape();cover.moveTo(-35,416);cover.quadraticCurveTo(-25,404,0,403);cover.quadraticCurveTo(25,404,35,416);cover.lineTo(17,426);cover.quadraticCurveTo(0,440,-17,426);cover.closePath();
  add('Meter lower cover',new THREE.ExtrudeGeometry(cover,{depth:4,bevelEnabled:false,curveSegments:16}).translate(0,0,18),C.rim);
  screw(0,416,23);label('TRANS PLATE MA',0,383,5);
  // Large tuning wheels, including offset spinner handles.
  for(const [x,amount] of [[-70,txTune],[70,tune]]) {
    disc(x<0?'Transmitter tuning wheel':'Receiver tuning wheel',x,433,14,25,11,C.black);
    torus('Tuning wheel edges',x,433,20,24,.8,C.rim);screw(x,433,22);
    const a=-Math.PI*.75+amount*Math.PI*1.5;
    disc(x<0?'Transmitter spinner':'Receiver spinner',x+Math.cos(a)*18,433+Math.sin(a)*18,27,5,15,C.black);
    disc('Spinner caps',x+Math.cos(a)*18,433+Math.sin(a)*18,35,4.4,1,C.metal);
  }
  knob(-53,493,10,value(p,'transmitterLock')==='locked'?1.2:-1.2,13,'Transmitter lock');knob(53,493,10,value(p,'receiverLock')==='locked'?1.2:-1.2,13,'Receiver lock');label('LOCK',-76,489,4);label('LOCK',76,489,4);
  for(const x of [-157,157]) {
    block('Tuning scale metal rim',x,453,6,15,34,3,C.brass,1);
    block('Amber tuning scale',x,453,8,11,30,1,lit?0xb89953:0x564e32,1);
    for(let i=0;i<7;i++)line('Frequency scale divisions',[x-4,440+i*4,9],[x+(i%2?0:3),440+i*4,9],.35,C.cream);
  }
  label('TRANS',-111,455,4);label('TUNING',-111,449,4);
  label('RECEIVER',113,459,4);label('TUNING',113,453,4);
  // Receiver scale pointer moves over the amber window.
  line('Station frequency cursor',[150,440+tune*24,10],[164,440+tune*24,10],.8,C.cream);
  line('Transmitter tuning cursor',[-164,440+txTune*24,10],[-150,440+txTune*24,10],.8,C.cream);
  knob(-158,397,12,angle('transmitterLoading'),13,'Transmitter loading');knob(158,397,12,angle('receiverAntenna'),13,'Receiver antenna');
  ticks(-158,397,23,-1.5,1.45,12);ticks(158,397,23,1.7,4.7,12);
  label('TRANS ANT',-157,362,4.5);label('LOADING',-157,356,4.5);
  label('REC ANT',157,362,4.5);label('TUNING',157,356,4.5);
  for(const x of [-112,112]) {
    disc('Band selector mounting',x,336,10,16,10,C.black);
    const bandId = x<0?'transmitterBand':'receiverBand';
    const bandAngle = (Math.max(1,Math.min(4,Number(value(p,bandId))))-1)*Math.PI/2;
    const start = new Map([...groups].map(([key,group])=>[key,group.gs.length]));
    block(bandId+' paddle',x,336,22,9,40,11,C.black,3);
    // An asymmetric ivory tip makes all four positions distinct.
    line(bandId+' index',[x,344,28.5],[x,353,28.5],1,C.cream);
    for(const [key,group] of groups) for(let i=start.get(key)||0;i<group.gs.length;i++)
      group.gs[i].translate(-x,-336,0).rotateZ(-bandAngle).translate(x,336,0);
    for(const [t,dx,dy] of [['1',0,28],['2',29,0],['3',0,-29],['4',-29,0]])label(t,x+dx,336+dy,5);
  }
  label('TRANS BAND',-112,298,4.5);label('RECEIVER BAND',112,298,4.5);
  knob(0,357,12,meter==='audio'?-.9:meter==='rf'?.9:0,13,'Meter switch');knob(-52,326,12,angle('audioFilament'),13,'Audio filament');knob(52,326,12,angle('rfFilament'),13,'RF filament');
  label('AUDIO FIL',-48,362,4.5);label('RHEOSTAT',-48,356,4.5);
  label('RF FIL',49,362,4.5);label('RHEOSTAT',49,356,4.5);
  label('METER SWITCH',0,316,4.5);
  // Riveted data plate.
  block('Data plate border',0,282,5.5,79,49,2,C.cream,2);
  block('Data plate enamel',0,282,6.8,77,47,1,C.dark,1);
  label('TYPE CRI-43044',0,299,4,7.5);label('TRANSMITTER-RECEIVER',0,293,2.8,7.5);
  label('FREQUENCY RANGE 28 TO 80 MC',0,287,2.6,7.5);
  line('Data plate rules',[-37,282,7.5],[37,282,7.5],.35,C.cream);
  label('NAVY DEPARTMENT - BUREAU OF SHIPS',0,277,2.3,7.5);
  label('WESTINGHOUSE ELECTRIC',0,270,2.8,7.5);label('SERIAL 2031',0,264,2.8,7.5);
  // Lower row: lamp, paired sockets, power toggle, key and crystal switch.
  label('LIGHT',-166,281,4);disc('Lamp bezel',-166,267,8,9,4,C.metal);disc('Light pushbutton',-166,267,value(p,'lightPressed')?9:12,6,5,C.black);
  function socket(x,y,connected) {
    disc('Connector mounting rings',x,y,9,17,7,C.metal);torus('Connector rims',x,y,15,14,1.5,C.brass);
    disc('Connector recesses',x,y,15,11,2,C.dark);
    if(connected) {disc('Cable plugs',x,y,24,12,23,C.metal);for(let i=0;i<5;i++)torus('Plug grip rings',x,y,16+i*3.5,12,.6,C.brass);disc('Cable strain relief',x,y,40,6,10,C.black)}
    else for(let i=0;i<4;i++){const a=i*Math.PI/2+.5;disc('Socket contacts',x+Math.cos(a)*7,y+Math.sin(a)*7,17,1.8,2,C.metal)}
  }
  socket(-154,215,true);socket(-94,215,false);socket(0,215,true);
  label('HEADPHONES',-127,245,4);label('AND MIC',-127,239,4);label('KEY',0,241,4.5);
  function toggle(x,y,up,name) {disc('Switch mounting washers',x,y,9,9,4,C.metal);disc('Switch hubs',x,y,12,5,5,C.brass);line(name,[x,y,14],[x,y+(up?7:-7),25],2.6,C.metal)}
  toggle(-42,215,value(p,'power')==='on','Power switch lever');label('POWER',-42,242,4.5);label('ON',-42,235,4);label('OFF',-42,197,4);
  toggle(43,215,value(p,'crystal')==='on','Crystal switch lever');label('CRYSTAL',43,242,4.5);label('ON',43,235,4);label('OFF',43,197,4);
  knob(95,218,13,angle('volume'),13,'Volume');knob(155,218,13,angle('regeneration'),13,'Regeneration');label('VOLUME',95,251,4.5);label('REGEN',155,251,4.5);
  ticks(95,218,23,.6,2.5,12);ticks(155,218,23,.6,2.5,12);
  // Battery controls sit inside an inset rounded rectangle.
  block('Battery control recess',0,134,5,121,33,3,C.trim,12);
  block('Battery recess inner plate',0,134,7,111,25,1,C.panel,9);
  toggle(0,135,value(p,'supplyPower')==='on','Battery switch lever');knob(32,135,9,0,13);disc('Battery pilot',-33,135,10,5,3,value(p,'supplyPower')==='on'?0xcdbd83:C.black);
  block('Battery legend border',0,96,5.5,125,27,2,C.brass,1);block('Battery legend enamel',0,96,7,122,24,1,C.black,1);
  label('PILOT    ON - OFF    FUSE',0,101,4,8);label('LIGHT     SWITCH     1 AMP',0,92,3.7,8);screw(-57,97,8);screw(57,97,8);
  // Raised lid handle, aerial post, side latches and pressed X ribs.
  for(const x of [-110,110]) {block('Handle standoffs',x,532,-90,9,23,17,C.metal,2);screw(x,516,19)}
  block('Carrying handle',0,545,-90,245,9,26,C.black,3);
  block('Handle canvas underside',0,540,-90,201,3,21,C.canvas,1);
  const ant=new THREE.CylinderGeometry(3,4,22,16);ant.translate(154,534,-148);add('Antenna terminal',ant,C.metal);
  for(const side of [-1,1]) {
    for(const [a,b] of [[[side*201,270,-195],[side*201,443,-25]],[[side*201,270,-25],[side*201,443,-195]]])line('Pressed side stiffeners',a,b,2.4,C.trim);
    for(const y of [191,475])block('Side latch mounts',side*203,y,-36,5,24,22,C.metal,2);
    block('Side draw latches',side*207,460,-36,5,27,13,C.trim,2);
    for(const z of [-32,-186]){
      block('Canvas strap mounts',side*203,174,z,9,15,30,C.trim,2);
      disc('Strap rivets',side*203,173,z+16,3,2,C.brass);
    }
    // Wide ribbon follows the loose, hanging carry sling on each side.
    const pts=[[side*209,174,-32],[side*220,98,-14],[side*241,40,-22],[side*260,31,-93],[side*241,76,-184],[side*210,175,-186]];
    const curve=new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v)));
    const pos=[],idx=[];
    for(let i=0;i<=64;i++){
      const v=curve.getPoint(i/64);
      pos.push(v.x-.8,v.y,v.z-12, v.x-.8,v.y,v.z+12, v.x+.8,v.y,v.z+12, v.x+.8,v.y,v.z-12);
      if(i<64) for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;idx.push(a,b,a+4,b,b+4,a+4)}
    }
    idx.push(0,2,1,0,3,2,256,257,258,256,258,259);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();add('Canvas carrying slings',g,C.canvas);
    for(const offset of [-10,10]){const edge=pts.map(v=>[v[0]+side*.3,v[1],v[2]+offset]);cable('Canvas stitched edging',edge,.65,0xc0a671)}
  }
  // Two attached leads curve down in front and return alongside the case.
  const leads=[[-154,[[-154,215,45],[-158,192,70],[-200,105,105],[-235,28,74],[-242,15,-42],[-215,18,-140]]],[0,[[0,215,45],[-4,165,71],[5,65,100],[-13,12,102],[-92,9,78],[-186,12,49],[-233,19,7]]]];
  for(const [x,pts] of leads){const curve=cable('Rubber connection leads',pts,4.7,C.black);for(let i=0;i<25;i++){const t=i*.008,pt=curve.getPoint(t),tan=curve.getTangent(t);const g=new THREE.TorusGeometry(5,.65,5,14);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),tan));g.translate(...pt.toArray());add('Coiled cable strain relief',g,C.metal)}}
  // Sparse deterministic paint chips around exposed edges, as in the photos.
  let seed=750;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  for(let i=0;i<390;i++) {let x,y,z;if(i<170){x=(rand()-.5)*380;y=rand()<.5?7+rand()*5:181+rand()*5;z=i<170&&y<20?4:23}else if(i<270){x=(rand()<.5?-1:1)*(184+rand()*7);y=12+rand()*485;z=6}else{x=(rand()-.5)*365;y=185+rand()*305;z=5.1}const r=.35+rand()*1.4;const g=new THREE.CircleGeometry(r,5);g.scale(1,.45+rand(),1);g.rotateZ(rand()*6);g.translate(x,y,z);add('Worn paint flecks',g,i%3?0x8b8c77:0xb3ac90)}
  // The meter is a printed dial, not a screen, so it carries no image slot.
  for(const {name,color,gs} of groups.values()) {parts.push({name,color,geometry:merge(gs),...(name==='Engraved ivory legends'?{lod:{surface:'z'}}:{})});gs.forEach(g=>g.dispose())}
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
