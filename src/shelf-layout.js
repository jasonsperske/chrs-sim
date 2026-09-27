// Shelf geometry shared by the collection layout and the 3D scene. Each shelf
// tile is TILE_W wide and TILE_H tall and holds SLOTS slots side by side. A
// radio too large for one slot spans several slots and rows; the boards inside
// that span are left out and dividers close its sides, like a bento box.
export const TILE_W=1000,TILE_H=530,SLOTS=3,SHELF_DEPTH=380;
export const SIDE=20,HALF_BOARD=24,DIVIDER=20;
export const INNER=TILE_W/2-SIDE,SEGMENT=2*INNER/SLOTS;
const single={w:1,h:1};
// Dense first-fit packing: each radio, in order, takes the highest then
// leftmost opening its footprint fits, so small radios fill the gaps beside
// large ones and newer radios stay near the top of the shelf.
export function packGroup(radios,footprintOf=()=>single) {
  const used=[],placements=[];
  const free=(row,col)=>!used[row]?.[col];
  for(const radio of radios){
    const {w,h}=footprintOf(radio)||single;
    const width=Math.min(Math.max(1,w),SLOTS),height=Math.max(1,h);
    let row=0,col=-1;
    for(;col<0;row++){
      for(let c=0;c+width<=SLOTS&&col<0;c++){
        let fits=true;
        for(let r=row;r<row+height&&fits;r++)for(let x=c;x<c+width&&fits;x++)fits=free(r,x);
        if(fits)col=c;
      }
      if(col>=0)break;
    }
    for(let r=row;r<row+height;r++){used[r]||=[];for(let x=col;x<col+width;x++)used[r][x]=true}
    placements.push({radio,col,row,w:width,h:height});
  }
  return {placements,rows:Math.max(1,used.length)};
}
// Local x of the boundary to the left of a slot, measured from the tile centre.
const boundary=slot=>-INNER+SEGMENT*slot;
// World-space cells, the board segments to leave out, and the dividers to add.
// group.x is a tile column and group.y the tile row of the group's top shelf.
export function layoutCollection(groups) {
  const cells=[],openings=new Set(),dividers=[];
  for(const group of groups)for(const {radio,col,row,w,h} of group.placements){
    const tileX=group.x*TILE_W,floorRow=group.y-row-h+1;
    const floorY=floorRow*TILE_H+HALF_BOARD,topY=(group.y-row+1)*TILE_H-HALF_BOARD;
    const merged=w>1||h>1;
    // Every cell stops short of interior slot edges, where a divider may stand.
    const left=col>0?boundary(col)+DIVIDER/2:boundary(col),right=col+w<SLOTS?boundary(col+w)-DIVIDER/2:boundary(col+w);
    cells.push({radio,groupId:group.id,x:tileX+(left+right)/2,floorY,topY,width:right-left,w,h});
    if(!merged)continue;
    for(let r=floorRow+1;r<floorRow+h;r++)for(let c=col;c<col+w;c++)openings.add(`${group.x*SLOTS+c},${r}`);
    for(const edge of [col,col+w])if(edge>0&&edge<SLOTS)dividers.push({x:tileX+boundary(edge),floorY,height:topY-floorY});
  }
  return {cells,openings,dividers};
}
