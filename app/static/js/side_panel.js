"use strict";

function toggleAttributes(e){
    var attributesList;
    if(e.id.slice(0,7) == 'default'){
        attributesList = document.getElementById('default-data-attributes');
    }
    attributesList.style.display = (attributesList.style.display === 'none') ? 'block' : 'none';
}

function toggleSources(e){
    var sourceList;
    if(e.id.slice(0,7) == 'default'){
        sourceList = document.getElementById('default-data-sources');
    }
    sourceList.style.display = (sourceList.style.display === 'none') ? 'block' : 'none';
}

function selectAttribute(e){
    var datasetId = e.dataset.sourceId
    var attributeName = e.textContent.trim()
    var url_string = SCRIPT_ROOT + 'get-data-attribute'
    var url = new URL(url_string)
    var params = {datasetId: datasetId, attributeName: attributeName}
    url.search = new URLSearchParams(params)
    fetch(url)
        .then(function(response) {
            return response.json();
        })
        .then(function(myJson) {
            console.log(JSON.stringify(myJson));
        });
}
