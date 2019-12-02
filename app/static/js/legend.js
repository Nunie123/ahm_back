function updateLegend(choropleth){
    removeLegend(choropleth);
    var legend = null;
    if(choropleth.choroplethProperties.length == 1){
        legend = L.control({position: 'bottomright'});
        legend.onAdd = function (map){
            let table = L.DomUtil.create('table', 'legend small-legend');
            let titleRow = document.createElement('tr');
            let highRow = document.createElement('tr');
            let midRow = document.createElement('tr');
            let lowRow = document.createElement('tr');
            let titleCell = L.DomUtil.create('th', 'legend-title');
            titleCell.colSpan = 2;
            let highColorCell = document.createElement('td');
            highColorCell.style.backgroundColor = choropleth.colors.highHigh;
            highColorCell.style.width = '33px';
            let midColorCell = document.createElement('td');
            midColorCell.style.backgroundColor = choropleth.colors.mediumMedium;
            let lowColorCell = document.createElement('td');
            lowColorCell.style.backgroundColor = choropleth.colors.lowLow;
            let highLebelCell = document.createElement('td');
            highLebelCell.textContent = 'High';
            let midLebelCell = document.createElement('td');
            midLebelCell.textContent = 'Medium';
            let lowLebelCell = document.createElement('td');
            lowLebelCell.textContent = 'Low';

            table.appendChild(titleRow);
            table.appendChild(highRow);
            table.appendChild(midRow);
            table.appendChild(lowRow);
            titleRow.appendChild(titleCell);
            highRow.appendChild(highColorCell);
            highRow.appendChild(highLebelCell);
            midRow.appendChild(midColorCell);
            midRow.appendChild(midLebelCell);
            lowRow.appendChild(lowColorCell);
            lowRow.appendChild(lowLebelCell);

            return table;
        };
        legend.addTo(choropleth.map);
    } else if(choropleth.choroplethProperties.length > 1){
        legend = L.control({position: 'bottomright'});
        legend.onAdd = function(map){
            let outerTable = L.DomUtil.create('table', 'legend legend-big');
            let topRow = document.createElement('tr');
            topRow.className = 'legend-top-row';
            outerTable.appendChild(topRow);
            let topTd = document.createElement('td');
            topTd.colSpan = '3';
            topRow.appendChild(topTd);
            let topText = document.createTextNode('Both');
            topTd.appendChild(topText);

            let middleRow = document.createElement('tr');
            middleRow.className = 'legend-middle-row';
            outerTable.appendChild(middleRow);
            let leftTd = document.createElement('td');
            leftTd.setAttribute('id', 'legend-left-text');
            middleRow.appendChild(leftTd);
            let leftText = document.createTextNode(choropleth.choroplethProperties[0].propertyName);
            leftTd.appendChild(leftText);
            let svgTd = document.createElement('td');
            svgTd.setAttribute('id', 'legend-diamond');
            middleRow.appendChild(svgTd);
            let rightTd = document.createElement('td');
            middleRow.appendChild(rightTd);
            rightTd.setAttribute('id', 'legend-right-text');
            let rightText = document.createTextNode(choropleth.choroplethProperties[1].propertyName);
            rightTd.appendChild(rightText);
            svgTd.innerHTML = `
            <svg width="99" height="99" xmlns="http://www.w3.org/2000/svg" 
                transform="rotate(45) translate(0,0)" opacity="0.8">
                <rect id="high-high" x="0" y="0" width="33" height="33" fill="${choropleth.colors.highHigh}"/>
                <rect id="medium-high" x="33" y="0" width="33" height="33" fill="${choropleth.colors.mediumHigh}"/>
                <rect id="low-high" x="66" y="0" width="33" height="33" fill="${choropleth.colors.lowHigh}"/>
                <rect id="high-medium" x="0" y="33" width="33" height="33" fill="${choropleth.colors.highMedium}"/>
                <rect id="medium-medium" x="33" y="33" width="33" height="33" fill="${choropleth.colors.mediumMedium}"/>
                <rect id="low-medium" x="66" y="33" width="33" height="33" fill="${choropleth.colors.lowMedium}"/>
                <rect id="high-low" x="0" y="66" width="33" height="33" fill="${choropleth.colors.highLow}"/>
                <rect id="medium-low" x="33" y="66" width="33" height="33" fill="${choropleth.colors.mediumLow}"/>
                <rect id="low-low" x="66" y="66" width="33" height="33" fill="${choropleth.colors.lowLow}"/>
            </svg>
            `;
            return outerTable;
        };
        legend.addTo(choropleth.map);
    }
    choropleth.legend = legend;
}

function removeLegend(choropleth){
    if(choropleth.legend){
        choropleth.map.removeControl(choropleth.legend);
        choropleth.legend = null;
    }
}

export { updateLegend };