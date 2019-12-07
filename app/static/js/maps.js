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

async function toggleFavorite(e){
    const node = e.target.closest('.favorite-map-button');
    const mapId = node.dataset.mapId;
    const signNode = node.childNodes[1];
    let url;
    if(node.dataset.fav == 'yes'){
        node.dataset.fav = 'no';
        signNode.nodeValue = '+';
        url = `${SCRIPT_ROOT}maps/${mapId}/remove_favorite`;
    } else {
        node.dataset.fav = 'yes';
        signNode.nodeValue = '-';
        url = `${SCRIPT_ROOT}maps/${mapId}/add_favorite`;
    }
    const response = await fetch(url);
    const json = await response.json();
    if(json.success != true){
        console.log(json.msg);
    } 
}

function addMapsEventListeners(){
    let deleteButtons = document.getElementsByClassName("delete-map-button");
    Array.from(deleteButtons).forEach(function(element) {
        element.addEventListener('click', deleteMap);
    });

    let favoriteButtons = document.getElementsByClassName("favorite-map-button");
    Array.from(favoriteButtons).forEach(function(element) {
        element.addEventListener('click', toggleFavorite);
    });

}
