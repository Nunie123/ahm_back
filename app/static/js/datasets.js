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

async function addFavorite(e){
    const node = e.target;
    const mapId = node.dataset.mapId;
    const url = `${SCRIPT_ROOT}maps/${mapId}/add_favorite`;
    const response = await fetch(url);
    const json = await response.json();
    if(json.success != true){
        console.log(json.msg);
    } 
}

function addDatasetsEventListeners(){
    var deleteButtons = document.getElementsByClassName("delete-attribute-button");
    Array.from(deleteButtons).forEach(function(element) {
        element.addEventListener('click', deleteAttribute);
    });

    var favoriteButtons = document.getElementsByClassName("favorite-data-button");
    Array.from(favoriteButtons).forEach(function(element) {
        element.addEventListener('click', addFavorite);
    });
}