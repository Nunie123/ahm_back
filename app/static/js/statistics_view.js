import { deleteChildren, hideById, showById } from './helpers.mjs';
import { TableView } from './table_view.js';

var jStat = window.jStat;  //imported from analysis.html

class StatisticsView {
    constructor(choropleth){
        this.choropleth = choropleth;
        this.showStatisticsView = this.showStatisticsView.bind(this);
    }

    showStatisticsView(e){
        let node = e.target;
        TableView.makeMapNavButtonsInactive();
        node.classList.toggle('btn-success');
        node.classList.toggle('btn-outline-success');
        this.renderStatisticsView();
        hideById('map');
        hideById('table-view');
        showById('statistics-view');
    }

    getStatisticsData(){
        let propertyNames = this.choropleth.choroplethProperties.map( property => property.propertyName);
        if(propertyNames.length == 0){return;}
        let data = this.choropleth.geoJson.features.map( feature => filterProperties(feature.properties, propertyNames));
    
        function filterProperties(propertyObj, propertyNames){
            let newObj = {};
            const regionName = propertyObj.NAME;
            newObj.regionName = regionName;
            newObj.propertyNames = propertyNames;
            newObj.values = [];
            propertyNames.forEach(function(property){
                newObj.values.push(propertyObj[property]);
            });
            return newObj;
        }
        return data;
    }

    generateSummaryStatistics(data){
        let arr1 = data.map( item => item.values[0]).filter( item => item != null);
        let statRows;
    
        if(data[0].propertyNames.length > 1){
            let arr2 = data.map( item => item.values[1]).filter( item => item != null);
            statRows = generateMultiVectorStats(arr1, arr2);
            let combinedArray = data.map( item => item.values).filter( item => item[0] != null && item[1] != null);
            let correlationArray1 = combinedArray.map( item => item[0]);
            let correlationArray2 = combinedArray.map( item => item[1]);
            let correlation = Math.round(jStat.corrcoeff(correlationArray1, correlationArray2)*1000)/1000;
            statRows.push(['Correlation', correlation, correlation]);
            let r2 = Math.round(Math.pow(correlation, 2)*1000)/1000;
            statRows.push(['R Squared', r2, r2]);
        } else {
            statRows = generateSingleVectorStats(arr1);
        }
        return statRows;
    
        function generateSingleVectorStats(vector){
            let statsArray = [];
            statsArray.push(['Data Element Count', vector.length]);
            statsArray.push(['Mean', Math.round(jStat.mean(vector)*100)/100]);
            statsArray.push(['Median', Math.round(jStat.median(vector)*100)/100]);
            let mode = jStat.mode(vector);
            let strMode = Array.isArray(mode) ? mode.join() : mode;
            statsArray.push(['Mode', strMode]);
            statsArray.push(['Min', jStat.min(vector)]);
            statsArray.push(['Max', jStat.max(vector)]);
            statsArray.push(['Range', Math.round(jStat.range(vector)*100)/100]);
            statsArray.push(['Standard Deviation', Math.round(jStat.stdev(vector)*1000)/1000]);
            let quartiles = jStat.quartiles(vector);
            let iqr = quartiles[2] - quartiles[0];
            statsArray.push(['Quartiles', quartiles.join()]);
            statsArray.push(['Interquartile Range', Math.round(iqr*100)/100]);
            statsArray.push(['Variance', Math.round(jStat.variance(vector)*100)/100]);
    
            return statsArray;
        }
    
        function generateMultiVectorStats(vector1, vector2){
            let statsArray1 = generateSingleVectorStats(vector1);
            let statsArray2 = generateSingleVectorStats(vector2);
            let fullStatsArray = statsArray1;
            for(let i=0; i < statsArray1.length; i++){
                fullStatsArray[i].push(statsArray2[i][1]);
            }
            return fullStatsArray;
        }
    
    }

    renderStatisticsView(){
        let data = this.getStatisticsData(this.choropleth) || Array();
        let statisticsTable = document.getElementById('statistics-table');
        if(data.length == 0){
            return;
        }
        let statRows = this.generateSummaryStatistics(data);
        deleteChildren(statisticsTable);
        let thead = document.createElement('thead');
        statisticsTable.appendChild(thead);
        let headRow = document.createElement('tr');
        thead.appendChild(headRow);
        let th = document.createElement('th');
        th.style.width = '20%';
        headRow.appendChild(th);
        data[0].propertyNames.forEach( function(name){
            let th = document.createElement('th');
            th.textContent = name;
            th.style.width = '40%';
            headRow.appendChild(th);
        });
        let tbody = document.createElement('tbody');
        statisticsTable.appendChild(tbody);
        statRows.forEach( function(row){
            let tr = document.createElement('tr');
            tbody.appendChild(tr);
            for(let i=0; i<row.length; i++){
                let td = document.createElement('td');
                td.textContent = row[i];
                tr.appendChild(td);
                if(i==0){
                    td.style.fontWeight = 'bold';
                    td.style.width = '20%';
                } else {
                    td.style.width = '40%';
                }
            }
        });
    }



}

export { StatisticsView };