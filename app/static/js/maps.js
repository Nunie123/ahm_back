const URL_ROOT = window.SCRIPT_ROOT;  

addMapsEventListeners();

async function deleteMap(e){
    const node = e.target;
    const mapId = node.dataset.mapId;
    const url = `${SCRIPT_ROOT}maps/${mapId}/remove_owner`;
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

function addMapsEventListeners(){
    var deleteButtons = document.getElementsByClassName("delete-map-button");
    Array.from(deleteButtons).forEach(function(element) {
        element.addEventListener('click', deleteMap);
    });

    var favoriteButtons = document.getElementsByClassName("favorite-button");
    Array.from(favoriteButtons).forEach(function(element) {
        element.addEventListener('click', addFavorite);
    });
}
