import { deleteChildren, hideById, showById } from './helpers.mjs';

class TableView {
    constructor(choropleth){
        this.choropleth = choropleth;
        this.showTableView = this.showTableView.bind(this);
    }

    getTableData(){
        let tableData = this.choropleth.geoJson.features.map( feature => feature.properties);
        return tableData;
    }

    renderTableView(){
        let data = this.getTableData();
        let tableView = document.getElementById('table-view');
        deleteChildren(tableView);
        let table = document.createElement('table');
        table.className = 'table';
        tableView.append(table);
        let thead = document.createElement('thead');
        table.appendChild(thead);
        let trHead = document.createElement('tr');
        thead.appendChild(trHead);
        let keys = Object.keys(data[0]);
        keys.forEach( function(key){
            let th = document.createElement('th');
            th.textContent = key;
            trHead.appendChild(th);
        });
        let tbody = document.createElement('tbody');
        table.appendChild(tbody);
        data.forEach(function(row){
            let tr = document.createElement('tr');
            tbody.appendChild(tr);
            keys.forEach(function(key){
                let td = document.createElement('td');
                td.textContent = row[key];
                tr.appendChild(td);
            });
        });
    }

    showTableView(e){
        let node = e.target;
        TableView.makeMapNavButtonsInactive();
        node.classList.toggle('btn-success');
        node.classList.toggle('btn-outline-success');
        this.renderTableView();
        hideById('map');
        showById('table-view');
        hideById('statistics-view');
    }

    static makeMapNavButtonsInactive(){
        let nav = document.getElementById('data-nav');
        let children = nav.getElementsByClassName('btn-success');
        for (let child of children){
            child.classList.remove('btn-success');
            child.classList.add('btn-outline-success');
        }
    }
}

export { TableView };