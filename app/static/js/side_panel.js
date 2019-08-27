load_map_attribute_selections();


function load_map_attribute_selections(){


    attributes.forEach(function(attribute) {
        textNode = document.createTextNode(attribute);
        li = document.createElement('li');
        li.className = 'list-group-item';
        button = document.createElement('button');
        button.className = 'btn btn-info attribute-button'
        li.appendChild(button);
        button.appendChild(textNode);
        attributeListEl.appendChild(li);
        button.addEventListener('click', function(){toggleMapLayer(attribute, attributeLevel)});
    });
};



function toggleMapLayer(layerName, attributeLevel) {
    if( state.activeMapLayerNames.indexOf(layerName) != -1 ){
        state.activeMapLayerNames.splice( state.activeMapLayerNames.indexOf(layerName), 1 );  //removes layerName from activeMapLayerNames
    } else {
        state.activeMapLayerNames.push(layerName)
    }
    refreshMapLayers(attributeLevel);
    updateSelectedAttributeDisplay();
};

function updateSelectedAttributeDisplay(){
    ul = document.getElementById('current-map-attributes');
    while (ul.firstChild) {
        ul.removeChild(ul.firstChild);
    };
    for(let i=0; i<state.activeMapLayerNames.length; i++){
        let layerName = state.activeMapLayerNames[i];
        let color = state.colors[i];
        let li = document.createElement('li');
        let textNode = document.createTextNode(layerName);
        li.className = 'current-attribute-item';
        li.style.color = color;
        li.appendChild(textNode);
        ul.appendChild(li);
    };
};