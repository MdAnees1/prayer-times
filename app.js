const $=id=>document.getElementById(id);
const prayerNames={Fajr:"Fajr",Sunrise:"Sunrise",Dhuhr:"Dhuhr",Asr:"Asr",Maghrib:"Maghrib",Isha:"Isha"};
const prayerOrder=["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];

function cleanTime(v){return (v||"").replace(/\s*\(.+\)$/,"").trim();}
function toDate(time, base=new Date()){
  const [h,m]=cleanTime(time).split(":").map(Number);
  const d=new Date(base); d.setHours(h,m,0,0); return d;
}
function fmt(d){
  return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
}
function dateParam(d){
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
}
function nightTimes(timings){
  const sunset=toDate(timings.Sunset||timings.Maghrib);
  const fajr=toDate(timings.Fajr);
  if(fajr<=sunset) fajr.setDate(fajr.getDate()+1);
  const half=(fajr-sunset)/2;
  const midnight=new Date(sunset.getTime()+half);
  const lastThird=new Date(sunset.getTime()+2*half/1); // overwritten below
  // Start of last third = sunset + 2/3 of night
  lastThird.setTime(sunset.getTime()+((fajr-sunset)*2/3));
  return {midnight,lastThird};
}
function currentPrayer(t){
  const now=new Date(), items=prayerOrder.filter(k=>t[k]).map(k=>[k,toDate(t[k])]);
  let active=null;
  for(const [k,d] of items) if(now>=d) active=k;
  return active;
}
async function load(){
  $("status").textContent="Loading…";
  $("refresh").disabled=true;
  try{
    const pos=await new Promise((resolve,reject)=>{
      if(!navigator.geolocation) return reject(new Error("Geolocation is not supported."));
      navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:300000});
    });
    const lat=pos.coords.latitude, lon=pos.coords.longitude;
    $("location").textContent=`${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    const today=new Date();
    const url=`https://api.aladhan.com/v1/timings/${dateParam(today)}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&method=1&school=0&midnightMode=1&iso8601=true`;
    const res=await fetch(url);
    if(!res.ok) throw new Error("Prayer API request failed.");
    const json=await res.json();
    if(json.code!==200) throw new Error(json.status||"Prayer API error.");
    const data=json.data, t=data.timings;
    $("gregorian").textContent=data.date.readable;
    $("hijri").textContent=`${data.date.hijri.day} ${data.date.hijri.month.en} ${data.date.hijri.year} AH`;
    $("updated").textContent=new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
    $("prayers").innerHTML=prayerOrder.map(k=>`<div class="prayer ${currentPrayer(t)===k?"current":""}"><span class="prayer-name">${prayerNames[k]}</span><span class="prayer-time">${fmt(toDate(t[k]))}</span></div>`).join("");
    const n=nightTimes(t);
    $("midnight").textContent=fmt(n.midnight);
    $("lastThird").textContent=fmt(n.lastThird);
    $("status").textContent="";
  }catch(e){
    $("status").textContent=e.message==="User denied Geolocation"?"Please allow location access and try again.":e.message;
  }finally{$("refresh").disabled=false}
}
$("refresh").addEventListener("click",load);
if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
load();
