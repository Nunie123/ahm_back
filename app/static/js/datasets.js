const URL_ROOT = window.SCRIPT_ROOT;  

addDatasetsEventListeners();

async function deleteAttribute(e){
    const node = e.target;
    const datasetId = node.dataset.sourceId;
    const attributeName = encodeURI(node.dataset.attributeName);
    console.log(attributeName)
    const year = node.dataset.year;
    console.log(year)
    console.log(node)
    const url = `${SCRIPT_ROOT}datasets/${datasetId}/${attributeName}/${year}/delete`;
    const response = await fetch(url);
    const json = await response.json();
    if(json.success == true){
        window.location.reload(true);
    } else {
        console.log(json.msg);
    }
}

async function deleteDataset(e){
    const node = e.target;
    const datasetId = node.dataset.sourceId;
    const url = `${SCRIPT_ROOT}datasets/${datasetId}/remove_owner`;
    const response = await fetch(url);
    const json = await response.json();
    if(json.success == true){
        window.location.reload(true);
    } else {
        console.log(json.msg);
    }
}

async function toggleFavorite(e){
    const node = e.target.closest('.favorite-data-button');
    const datasetId = node.dataset.sourceId;
    const signNode = node.childNodes[1];
    let url;
    if(node.dataset.fav == 'yes'){
        node.dataset.fav = 'no';
        signNode.nodeValue = '+';
        url = `${SCRIPT_ROOT}datasets/${datasetId}/remove_favorite`;
    } else {
        node.dataset.fav = 'yes';
        signNode.nodeValue = '-';
        url = `${SCRIPT_ROOT}datasets/${datasetId}/add_favorite`;
    }
    const response = await fetch(url);
    const json = await response.json();
    if(json.success != true){
        console.log(json.msg);
    } 
}

function toggleAttributes(e){
    console.log('clicked!')
    const node = e.target.closest('.show-attributes-btn');
    console.log(node)
    console.log(node.getAttribute('aria-expanded'))
    if(node.getAttribute('aria-expanded') == 'true'){
        node.innerHTML = '<i class="fas fa-chevron-down"></i> Show Attributes <i class="fas fa-chevron-down"></i>';
    } else {
        node.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Attributes <i class="fas fa-chevron-up"></i>';
    }
}

function addDatasetsEventListeners(){
    let deleteAttributesButtons = document.getElementsByClassName("delete-attribute-button");
    Array.from(deleteAttributesButtons).forEach(function(element) {
        element.addEventListener('click', deleteAttribute);
    });

    let deleteDatasetButtons = document.getElementsByClassName("delete-dataset-button");
    Array.from(deleteDatasetButtons).forEach(function(element) {
        element.addEventListener('click', deleteDataset);
    });

    let favoriteButtons = document.getElementsByClassName("favorite-data-button");
    Array.from(favoriteButtons).forEach(function(element) {
        element.addEventListener('click', toggleFavorite);
    });

    let toggleAttributesButton = document.getElementsByClassName("show-attributes-btn");
    Array.from(toggleAttributesButton).forEach(function(element) {
        element.addEventListener('click', toggleAttributes);
    });
}