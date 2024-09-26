import { properties, distributionLine } from "./properties.js";
import { serviceLines } from "./serviceLines.js";
//import {} from ""
// 儲存所有marker(house)跟property, lines
let markers = [];
let lines = [];
let popup = 1;
let dataToSend = new Array(32).fill(0); // 31 pv sizes and 1 indicator 

async function initMap() {
  console.log("initMap! start");

  // Request needed libraries.
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const { Polyline } = await google.maps.importLibrary("drawing");
  const center = { lat: -37.649965818487985, lng: 145.1050029913465 };
  const map = new Map(document.getElementById("map"), {
    zoom: 16.5,
    center,
    mapId: "4504f8b37365c3d0",
  });


  // Create distribution lines --------------------------------------------------------------------------- //

  const lineCoordinates1 = [
    { lat: -37.64939055109588, lng: 145.1035081313603 },
    { lat: -37.65176131807835, lng: 145.10816739521474 },
    { lat: -37.651861942036106, lng: 145.10887157501247 },
    { lat: -37.65132635345691, lng: 145.11056275093824 },
    { lat: -37.650622431163534, lng: 145.1114228346941 },
  ];

  const lineCoordinates2 = [
    { lat: -37.65176131807835, lng: 145.10816739521474 },
    { lat: -37.65252453320962, lng: 145.10866916354104 },
    { lat: -37.65326895879042, lng: 145.109651813215 },
  ];

  // Create the polylines and add them to the map.
  const polyline1 = new google.maps.Polyline({
    path: lineCoordinates1,
    geodesic: true,
    strokeColor: "#3E3E6A",
    strokeOpacity: 1.0,
    strokeWeight: 8,
  });

  const polyline2 = new google.maps.Polyline({
    path: lineCoordinates2,
    geodesic: true,
    strokeColor: "#3E3E6A",
    strokeOpacity: 1.0,
    strokeWeight: 8,
  });

  polyline1.setMap(map);
  polyline2.setMap(map);

  // Draw serviceLine
  serviceLines.forEach((line) => {
    const polyline = new google.maps.Polyline({
      path: line,
      geodesic: true,
      strokeColor: "#696969",
      strokeOpacity: 1.0,
      strokeWeight: 2,
    });

    // 把線段顯示在地圖上
    polyline.setMap(map);
  });

  // 創建一個彈窗 InfoWindow 並將其內容設置為你想要的訊息
  lines = new google.maps.InfoWindow({
    content: buildLineContent(distributionLine),
  });

  // polyline 加入事件
  polyline1.addListener("click", function (event) {
    lines.setPosition(event.latLng);
    lines.open(map);
  });

  polyline2.addListener("click", function (event) {
    lines.setPosition(event.latLng);
    lines.open(map);
  });

  // Create Marker --------------------------------------------------------------------------------------------//
  console.log("initMap content building");
  for (const property of properties) {
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      content: buildContent(property),
      position: property.position,
      title: property.description,
    });

    marker.addListener("click", () => {
      toggleHighlight(marker, property);
    });

    markers.push({ marker, property });
  }
  console.log("initMap content builded! ");


  // Base case 彈窗
  const define_button = document.getElementById("defineButton");
  define_button.addEventListener("click", function () {
    togglePopupWindow(1);
  }); 
  
  const close_button = document.getElementById("close");
  close_button.addEventListener("click", function () {
    updateData(0);
    togglePopupWindow(1);
  });

  const cross_button = document.getElementById("cross");
  cross_button.addEventListener("click", function () {
    updateData(0);
    togglePopupWindow(2);
  });

  //reset data
  const reset_button = document.getElementById("resetButton");
  reset_button.addEventListener("click", function () {
    updateData(1);
  });

  //send and calculate PowerFlow31
  const calculate_PowerFlow_button = document.getElementById("calculatePowerFlow31");


  calculate_PowerFlow_button.addEventListener("click", function () {
    updateData(0);
    sentDataToBackend(0);
    togglePopupWindow(1);
    calculate_HC_button.disabled = false; // 把button disabled = false


  });

  //send and calculate HC
  const calculate_HC_button = document.getElementById("calculateHostingCapacity");
  calculate_HC_button.addEventListener("click", function () {
    updateData(0);
    sentDataToBackend(1);
    // togglePopupWindow(2);
    // calculate_HC_button.disabled = true;
  });

  // const boxplot1 = document.getElementById("boxplot1");
  // boxplot1.setAttribute("src", "path/to/your/image.png");

}

function togglePopupWindow(type) {
  console.log("BaseCase clicked!");
  if(type == 1){
    const popupWindow = document.getElementById("calculator");
    if (popup == 1) {
      popupWindow.style.display = "none";
      popup = 0;
    } else {
      popupWindow.style.display = "block";
      popup = 1;
    }
  }else{
    const popupWindow = document.getElementById("graphBox");
    if (popup == 1) {
      popupWindow.style.display = "none";
      popup = 0;
    } else {
      popupWindow.style.display = "block";
      popup = 1;
    }
  }
  
}

function toggleHighlight(marker, property) {
  const content = marker.content;

  // when pop up box contains information, "click" the marker to remove the pop up box
  if (content.classList.contains("highlight")) {
    marker.zIndex = 1;
    document.removeEventListener("click", handleClickOutside);
  } else {
    content.classList.add("highlight");
    marker.zIndex = 1;
    document.addEventListener("click", handleClickOutside);
  }

  if (property.id != 0) {
    document.getElementById(`input-${property.id}`).focus(); //永遠focus在輸入匡, 但transformer不需要輸入匡
  }

  function handleClickOutside(event) {
    console.log("ClickOutside, clicked id", property.id);
    if (!content.contains(event.target) && !event.target.closest(".property")) {
      content.classList.remove("highlight");
      marker.zIndex = null;
      document.removeEventListener("click", handleClickOutside);
    }
  }
}

function updateData(reset) {
  // 1 indicates true to reset data.
  if(reset == 1){

    for (let i = 1; i <= 31; i++) {
      const inputvalue = document.getElementById(`input-value-id-${i}`);
    
      inputvalue.value = 0; // reset all to zero 
      dataToSend[i-1] = parseInt(inputvalue.value, 10);
      // inputvalue.value = ""; // after reset all to zero, still show the placeholder prompt 
      
    }

  }else{

    for (let i = 1; i <= 31; i++) {
      const inputvalue = document.getElementById(`input-value-id-${i}`);
      var result = parseInt(inputvalue.value, 10);
  
      if (inputvalue.value !== "" && inputvalue.value >= 0 && inputvalue.value <= 100 && Number.isInteger(result)) {
        console.log(result);
        console.log(i);
        dataToSend[i-1] = result;
      }
    }
  }
}

function sentDataToBackend(indicator){
  // indicator 0 indicates PowerFlow31, 1 indicates HC
  if (indicator == 0){
    dataToSend[31] = 0;
    socket.send(JSON.stringify(dataToSend));

  }else{
    dataToSend[31] = 1;
    socket.send(JSON.stringify(dataToSend));
  }

  console.log("-----------------");
  console.log(dataToSend);
  console.log("Data updated");

}

// click button 觸發 sendInputValues 回傳PV size值到後端
// window 變成全域變數, propertyId 就是 house index
window.sendInputValues = function (propertyId) {
  const inputValue = document.getElementById(`input-${propertyId}`).value; // 取出特定house的值
  const dataToSend = {
    value: parseInt(inputValue, 10),
    index: propertyId,
  };
  socket.send(JSON.stringify(dataToSend));
};

// line彈窗測試
function buildLineContent(lineInfo) {
  const content = document.createElement("div");
  content.classList.add("highlight");
  content.classList.add("line");
  // ------------------------------------ Create line information ---------------------------------------- //
  var firstString = `
          <div class="icon">
              <i aria-hidden="true" class="fa fa-lg fa-bars phase-ABC" title="distribution_Line"></i>
              <span class="fa-sr-only">bolt</span>
          </div>
          <div class="details">
              <div class="address">"Distribution Line"</div>`;

  // house features:
  var houseFeatures = `<div class="features">  

                <div id="PhaseA" title="PhaseA">
                    <i aria-hidden="true" class="fa fa-a fa-lg phaseA-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${lineInfo.apparentA} kVA</span>
                </div>

                <div id="PhaseB" title="PhaseB">
                    <i aria-hidden="true" class="fa fa-b fa-lg phaseB-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${lineInfo.apparentB} kVA</span>
                </div>

                <div id="PhaseC" title="PhaseC">
                    <i aria-hidden="true" class="fa fa-c fa-lg phaseC-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${lineInfo.apparentC} kVA</span>
                </div>

                </div> 
        </div> `;

  var contentString = firstString + houseFeatures;
  content.innerHTML = contentString;
  return content;
}

function buildContent(property) {
  const content = document.createElement("div");
  content.classList.add("property");
  // ------------------------------------ Create house pop up box information ---------------------------------------- //
  var propertyName = `
        <div class="icon">
            <i aria-hidden="true" class="fa fa-icon fa-${property.type} phase-${property.phase}" title="${property.type}"></i>
            <span class="fa-sr-only">${property.type}</span>
        </div>
        <div class="details">
            <div class="address">${property.address}</div>`;

  var transformerFeatures =
    // control whether to show the price label
    `<div id="price-${property.id}" class="price"> Utilisation ${property.price} %</div>` +
    // transformer features: A B C
    `<div class="features">
                <div id="ActivePower-${property.id}" title="ActivePower">
                    <i aria-hidden="true" class="fa fa-a fa-lg phaseA-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ActivePower[0]} kW</span>
                </div>

                <div id="ActivePower-${property.id}" title="ActivePower">
                    <i aria-hidden="true" class="fa fa-b fa-lg phaseB-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ActivePower[1]} kW</span>
                </div>

                <div id="ActivePower-${property.id}" title="ActivePower">
                    <i aria-hidden="true" class="fa fa-c fa-lg phaseC-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ActivePower[2]} kW</span>
                </div>
    </div>

    <div class="features">
                <div id="ReactivePower-${property.id}" title="ReactivePower">
                    <i aria-hidden="true" class="fa fa-a fa-lg phaseA-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ReactivePower[0]} kvar</span>
                </div>

                <div id="ReactivePower-${property.id}" title="ReactivePower">
                    <i aria-hidden="true" class="fa fa-b fa-lg phaseB-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ReactivePower[1]} kvar</span>
                </div>

                <div id="ReactivePower-${property.id}" title="ReactivePower">
                    <i aria-hidden="true" class="fa fa-c fa-lg phaseC-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ReactivePower[2]} kvar</span>
                </div>
    </div>

    <div class="features">
                <div id="ApparentPower-${property.id}" title="ApparentPower">
                    <i aria-hidden="true" class="fa fa-a fa-lg phaseA-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ApparentPower[0]} kVA</span>
                </div>

                <div id="ApparentPower-${property.id}" title="ApparentPower">
                    <i aria-hidden="true" class="fa fa-b fa-lg phaseB-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ApparentPower[1]} kVA</span>
                </div>

                <div id="ApparentPower-${property.id}" title="ApparentPower">
                    <i aria-hidden="true" class="fa fa-c fa-lg phaseC-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ApparentPower[2]} kVA</span>
                </div>
    </div>

                <div  id='voltagePlot-${property.id}' >
                    <image src="data:image/png;base64,${property.utilisationPlot}" style="width:500px;height:250px;"/>  
                </div>`;

  // house features:
  var houseFeatures = `<div class="features">
                <div id="Voltage" title="Voltage">
                    <i aria-hidden="true" class="fa fa-bolt fa-lg voltage-color" title="Voltage"></i>
                    <span class="fa-sr-only">voltage</span>
                    <span id='vol-${property.id}'> ${property.voltage} V</span>
                </div>

                <div id="ActivePower-${property.id}" title="ActivePower">
                    <i aria-hidden="true" class="fa fa-p fa-lg sun-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ActivePower} kW</span>
                </div>

                <div id="ReactivePower" title="ReactivePower">
                    <i aria-hidden="true" class="fa fa-q fa-lg Q-color" title="sun"></i>
                    <span class="fa-sr-only">penetration</span>
                    <span>${property.ReactivePower} kVar</span>
                </div>`;

                // <div id="Hosting Capacity" title="Hosting Capacity">
                //     <i aria-hidden="true" class="fa fa-expand fa-lg hostingcapacity-color" title="Hosting Capacity"></i>
                //     <span class="fa-sr-only">hostingcapacity</span>
                //     <span>${property.hostingcapacity} %</span>
                // </div>`;

  // input editview
  var pvInput = `<div id="PV_input">
                    <i aria-hidden="true" class="fa fa-keyboard fa-lg input-color" title="PV_input"></i>
                    <span class="fa-sr-only">Input</span>
                    <input type="number" id='input-${property.id}' name='input-${property.id}' placeholder="PV size (KVA)" min="0" max="100">
                    <button type="button" class="btn btn-primary" onclick="sendInputValues(${property.id})">Enter</button>
                    </div>
    </div>
            <div  id='voltagePlot-${property.id}' >
              <image src="data:image/png;base64,${property.voltagePlot}" style="width:500px;height:250px;"/>  
            </div>
        </div> `;

  var contentString = propertyName + houseFeatures + pvInput;

  if (property.id == 0) {
    contentString = propertyName + transformerFeatures;
  }

  content.innerHTML = contentString;
  return content;
}

initMap();

// 建立 WebSocket 連線
const socket = new WebSocket("wss://https://capstone02-96071185b037.herokuapp.com/"); //TODO: Link to backend

// 當連線開啟時，發送資料給伺服器
socket.onopen = () => {
  socket.send("From 0801.js");
  console.log("Connected to WebSocket");
};

// 當收到伺服器的回應時
socket.onmessage = async (event) => {
  console.log("socket.onmessage");
  var outputData = JSON.parse(event.data); // 解析JSON对象 接收websocket_server
  //console.log(outputData);// 解析JSON数据中的变量
  var V = outputData.V;
  var P = outputData.P;
  var Q = outputData.Q;
  var phaseA = outputData.phaseA;
  var phaseB = outputData.phaseB;
  var phaseC = outputData.phaseC;
  var Utilisation = outputData.utilisation;
  var time = outputData.time_str;
  var currentPenetration = outputData.PV_penetration;

  var hc = outputData.HC;
  var remainhc = outputData.RemainHC;


  var voltagePlots = outputData.voltagePlots;
  var utilisationPlot = outputData.utilisationPlot;

  var voltageBoxPlot = outputData.voltageBoxPlot;
  var utilisationBoxPlot = outputData.utilisationBoxPlot;

  var indicator = outputData.indicator;

  // 強制websocket晚一點回傳數值
  await new Promise((resolve) => setTimeout(resolve, 370));


  // Update the top right information
  updateMapInfo(hc, remainhc, currentPenetration, indicator, voltageBoxPlot, utilisationBoxPlot);

  // 用所有V更新markers資訊
  initMarkers(markers, V, P, Q, phaseA, phaseB, phaseC, Utilisation, hc, voltagePlots, utilisationPlot);

  // 更新線上的彈窗訊息內容
  updateLines(phaseA, phaseB, phaseC);
};

// 當連線關閉時
socket.onclose = () => {
  console.log("WebSocket connection closed");
};

// 當連線發生錯誤時
socket.onerror = (error) => {
  console.error("WebSocket error:", error);
};

// indicator: 0:do powerflow, 1:do HC, 2:do all, None: non
function updateMapInfo(hc, remainhc, currentPenetration, indicator, voltageBoxPlot, utilisationBoxPlot) {
  var hostingcapacity = hc;
  var remainingcapacity = remainhc;
  var penetration = currentPenetration;
  var indicator = indicator;

  if(indicator == 1){
    document.getElementById("HostingCapacity-value").textContent = `${hostingcapacity} %`;
    document.getElementById("RemainingCapacity-value").textContent = `${remainingcapacity} %`;
  }
  else if(indicator == 0){
    document.getElementById("Penetration-value").textContent = `${penetration} %`;
  }else if(indicator == 2){

    // indicator is 2 indicates that calculate all of them.
    document.getElementById("HostingCapacity-value").textContent = `${hostingcapacity} %`;
    document.getElementById("RemainingCapacity-value").textContent = `${remainingcapacity} %`;
    document.getElementById("Penetration-value").textContent = `${penetration} %`;
  }

  // <image src="data:image/png;base64,${property.voltagePlot}" style="width:500px;height:250px;"/> 
  
  // const boxplot1 = document.getElementById("boxplot1");
  // boxplot1.setAttribute("src", voltageBoxPlot);
  // console.log(voltageBoxPlot);
  // boxplot1.src = voltageBoxPlot; // Set the src with the Base64 data URL


}

// Yuchen 0725 只要有其中一個house voltage被更新 就刷新頁面跟地圖
// makers.length is 32，但第0個marker是transformer 所以i==0 不需要
function initMarkers(markers, new_voltage, new_active, new_reactive, phaseA, phaseB, phaseC, new_utilisation, hc, voltagePlots, utilisationPlot) {
  console.log("update marker - build content");

  for (let i = 0; i < markers.length; i++) {
    if (i == 0) {
      markers[i].property.ActivePower[0] = phaseA[0];
      markers[i].property.ActivePower[1] = phaseB[0];
      markers[i].property.ActivePower[2] = phaseC[0];

      markers[i].property.ReactivePower[0] = phaseA[1];
      markers[i].property.ReactivePower[1] = phaseB[1];
      markers[i].property.ReactivePower[2] = phaseC[1];

      markers[i].property.ApparentPower[0] = phaseA[2];
      markers[i].property.ApparentPower[1] = phaseB[2];
      markers[i].property.ApparentPower[2] = phaseC[2];

      markers[i].property.utilisationPlot = utilisationPlot; //Test transformer image 

      markers[i].property.price = new_utilisation;
    } else {
      // console.log(markers[i].property.id); // Check all houses id
      markers[i].property.voltage = new_voltage[i - 1]; // 第1個marker是第1個house, 數值從第0個new_voltage[0]來
      markers[i].property.ActivePower = new_active[i - 1]; // 第1個marker是第1個house, 數值從第0個new_active[0]來
      markers[i].property.ReactivePower = new_reactive[i - 1]; // 第1個marker是第1個house, 數值從第0個new_reactive[0]來
      markers[i].property.voltagePlot = voltagePlots[i-1]; //JS可以之後綁定欄位, image update
      // console.log("Updated voltage data:", markers[i].property.voltage);
    }
    markers[i].property.hostingcapacity = hc;

    updateMarker(markers[i]); // 第1個marker是第1個house, 呼叫函式更新彈窗標籤
  }
}

function updateMarker(markerData) {
  const { marker, property } = markerData;
  const newContent = buildContent(property);
  marker.content.innerHTML = newContent.innerHTML;
}

// Update line content
function updateLines(phaseA, phaseB, phaseC) {
  // 更新 distributionLine 的數據
  lines.distributionLine = {
    apparentA: phaseA[2],
    apparentB: phaseB[2],
    apparentC: phaseC[2],
  };
  const newLineContent = buildLineContent(lines.distributionLine);
  lines.setContent(newLineContent);
}
