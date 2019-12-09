import { updateLegend } from './legend.js';
import { deleteChildren } from './helpers.js';

const URLSearchParams = window.URLSearchParams;  //JSHint doesn't recognize this global object
var URL_ROOT = window.SCRIPT_ROOT;  //imported from analysis.html


class SidePanel {
    constructor(choropleth){
        this.selectedAttributes = [];
        this.choropleth = choropleth;
        this.toggleYearList = this.toggleYearList.bind(this);
        this.tableView = null;
        this.statisticsView = null;

    }

    async selectAttribute(e){
        if(this.selectedAttributes.length >= 2){return;}
        let attribute = {};
        let node = e.target;
        attribute.datasetId = node.dataset.sourceId;
        attribute.attributeName = node.dataset.attributeName;
        attribute.attributeYear = node.textContent.trim();
        this.processAttribute(attribute);
        let parent = node.parentNode;
        deleteChildren(parent);
    }

    async processAttribute(attribute){
        this.selectedAttributes.push(attribute);
        const data = await this.getAttributeData(attribute);
        this.choropleth.addChoroplethProperty(data);
        this.addAttributeToSidePanel(attribute.attributeName, attribute.attributeYear);
        this.tableView.renderTableView();
        this.statisticsView.renderStatisticsView();
        updateLegend(this.choropleth);
    }

    async getAttributeData(attribute){
        let url_string = URL_ROOT + 'get-data-attribute';
        let url = new URL(url_string);
        let params = {datasetId: attribute.datasetId, attributeName: attribute.attributeName, attributeYear: attribute.attributeYear};
        url.search = new URLSearchParams(params);
        const response = await fetch(url);
        const responseArray = await response.json();
        return responseArray;
    }

    addAttributeToSidePanel(attributeName, attributeYeear){
        let attributeListEl = document.getElementById('selected-attributes');
        let attributeWrapper = document.createElement('div');
        let topRow = document.createElement('div');
        topRow.className = 'row';
        let attributeTextDiv = document.createElement('div');
        attributeTextDiv.className = 'attribute-cell col-sm-12';
        attributeTextDiv.textContent = attributeName;
        let bottomRow = document.createElement('div');
        bottomRow.className = 'row';
        let yearDiv = document.createElement('div');
        yearDiv.className = 'col-sm-8 attribute-cell';
        yearDiv.textContent = attributeYeear;
        let cancelDiv = document.createElement('div');
        cancelDiv.className = 'attribute-remove-button col-sm-4 attribute-cell';
        cancelDiv.textContent = 'remove';
        cancelDiv.dataset.attributeName = attributeName;
        cancelDiv.addEventListener('click', this.removeAttribute.bind(this));
        
        attributeListEl.appendChild(attributeWrapper);
        attributeWrapper.appendChild(topRow);
        attributeWrapper.appendChild(bottomRow);
        topRow.appendChild(attributeTextDiv);
        bottomRow.appendChild(yearDiv);
        bottomRow.appendChild(cancelDiv);
    }

    removeAttribute(e){
        var clickedEl = e.target;
        var attributeName = clickedEl.dataset.attributeName;
        var grandParent = clickedEl.parentNode.parentNode;
        grandParent.parentNode.removeChild(grandParent);
        this.choropleth.removeChoroplethProperty(attributeName);
        this.selectedAttributes = this.selectedAttributes.filter( attribute => attribute.attributeName != attributeName);
        updateLegend(this.choropleth);
        this.tableView.renderTableView();
        this.statisticsView.renderStatisticsView();
    }

    toggleAttributes(e){
        let button = e.target.closest('.dataset-btn');
        let list = button.nextSibling.nextSibling;
        list.style.display = (list.style.display === 'none') ? 'block' : 'none';
        let icon = button.children[0];
        icon.classList.toggle('fa-plus-square');
        icon.classList.toggle('fa-minus-square');
    }
    
    toggleSources(e){
        let button = e.target.closest('.source-btn');
        let list = button.nextSibling.nextSibling;
        list.style.display = (list.style.display === 'none') ? 'block' : 'none';
        let icon = button.children[0];
        icon.classList.toggle('fa-plus-square');
        icon.classList.toggle('fa-minus-square');
    }
    
    async toggleYearList(e){
        let node = e.target;
        let yearList = node.nextSibling.nextSibling;
        const datasetId = node.dataset.sourceId;
        const attributeName = node.textContent.trim();

        let createYearButtons = yearArray => {
            yearArray.forEach(function(year){
                let btn = document.createElement('button');
                btn.className = 'list-group-item list-group-item-action list-group-item-light';
                btn.textContent = year;
                btn.dataset.sourceId = datasetId;
                btn.dataset.attributeName = attributeName;
                btn.addEventListener('click', this.selectAttribute.bind(this));
                yearList.appendChild(btn);
            }.bind(this));

        };
        if(yearList.childNodes.length > 0){
            deleteChildren(yearList);
        } else {
            const url_string = URL_ROOT + 'get-attribute-years';
            let url = new URL(url_string);
            const params = {datasetId: datasetId, attributeName: attributeName};
            url.search = new URLSearchParams(params);
            const response = await fetch(url);
            const responseArray = await response.json();
            createYearButtons(responseArray);
        }
    }
    
    toggleSideBar(){
        let sidePanel = document.getElementById('map-side-panel');
        sidePanel.classList.toggle('visible-panel');
        sidePanel.classList.toggle('hidden-panel');
        let toggleButton = document.getElementById('side-panel-toggle');
        toggleButton.classList.toggle('visible-panel');
        toggleButton.classList.toggle('hidden-panel');
        let tableView = document.getElementById('table-view');
        tableView.classList.toggle('table-small');
        if (toggleButton.classList.contains('visible-panel')){
            toggleButton.textContent = 'Hide';
        } else {
            toggleButton.textContent = 'Show';
        }
    }

}


export { SidePanel };