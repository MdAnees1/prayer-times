const $=id=>document.getElementById(id);
const order=["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];
function clean(v){return String(v||"").replace(/\s*\(.+\)$/,"").trim()}
function toDate(v,base=new Date()){
  const s=clean(v);
  if(s.includes("T")){const x=new Date(s);if(!Number.isNaN(x.getTime()))return x}
  const m=s.match(/(\d{1,2}):(\d{2})/); if(!m)return new Date(NaN);
  const d=new Date(base);d.setHours(+m[1],+m[2],0,0);return d
}
function fmt(d){return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}
function paramDate(d){return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`}
function night(t){
  const sunset=toDate(t.Sunset||t.Maghrib),fajr=toDate(t.Fajr);
  if(Number.isNaN(sunset.getTime())||Number.isNaN(fajr.getTime()))throw Error("Could not read Sunset/Fajr.");
  if(fajr<=sunset)fajr.setDate(fajr.getDate()+1);
  const n=fajr-sunset;
  return {mid:new Date(sunset.getTime()+n/2),last:new Date(sunset.getTime()+n*2/3)}
}
async function load(){
 $("status").textContent="Loading…"; $("refresh").disabled=true;
 try{
  const p=await new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(ok,no,{enableHighAccuracy:true,timeout:15000,maximumAge:300000}));
  const lat=p.coords.latitude,lon=p.coords.longitude;$("location").textContent=`${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  const u=`https://api.aladhan.com/v1/timings/${paramDate(new Date())}?latitude=${lat}&longitude=${lon}&method=1&school=0&midnightMode=1&iso8601=false`;
  const r=await fetch(u);if(!r.ok)throw Error("Prayer API request failed.");
  const j=await r.json();if(j.code!==200)throw Error(j.status||"Prayer API error.");
  const d=j.data,t=d.timings;$("gregorian").textContent=d.date.readable;$("hijri").textContent=`${d.date.hijri.day} ${d.date.hijri.month.en} ${d.date.hijri.year} AH`;$("updated").textContent=new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  const now=new Date();let active=null;for(const k of order){const x=toDate(t[k]);if(now>=x)active=k}
  $("prayers").innerHTML=order.map(k=>`<div class="prayer ${active===k?"current":""}"><span class="prayer-name">${k}</span><span class="prayer-time">${fmt(toDate(t[k]))}</span></div>`).join("");
  const n=night(t);$("midnight").textContent=fmt(n.mid);$("lastThird").textContent=fmt(n.last);$("status").textContent=""
 }catch(e){$("status").textContent=e.code===1?"Location permission was denied. Allow location access in Safari.":e.message}
 finally{$("refresh").disabled=false}
}
$("refresh").onclick=load;load();