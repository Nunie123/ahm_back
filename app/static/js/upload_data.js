addUploadEventListener();

function addUploadEventListener() {
    let fileSelectInput = document.getElementById('file-import');
    fileSelectInput.onclick = function(){
        fileSelectInput.value = '';
    };
    fileSelectInput.onchange = function(){
        displayFieldMapper(fileSelectInput);
    };
}

function displayFieldMapper(uploadInput){
    let file = uploadInput.files[0];
    Papa.parse(file, {
        preview: 5,
        header: true,
        complete: function (results) {
            let table = document.getElementById('field-mapper');
            table.innerHTML = '<thead><tr><th>Field Name</th><th>Field Label</th></tr></thead>';
            let tbody = document.createElement('tbody');
            tbody.id = 'mapping-tbody';
            table.appendChild(tbody);
            results.meta.fields.forEach(function(field){
                let row = document.createElement('tr');
                let nameCell = document.createElement('td');
                nameCell.textContent = field;
                let labelCell = document.createElement('td');
                labelCell.innerHTML = ('<select class="field-label">' +
                                        '<option value="ignore">ignore</option>' +
                                        '<option value="geographic-label">Geographic Label</option>' +
                                        '<option value="attribute-name">Attribute Name</option>' +
                                        '<option value="attribute-value">Attribute Value</option>' +
                                        '<option value="attribute-year">Attribute Year</option>' +
                                        '</select>');
                row.appendChild(nameCell);
                row.appendChild(labelCell);
                tbody.appendChild(row);

            });
        }
    });
}

function clearModal(){
    let table = document.getElementById('field-mapper');
    table.innerHTML='';
    let fileSelectInput = document.getElementById('file-import');
    fileSelectInput.value = '';
}

function uploadDataset(){
    let uploadInput = document.getElementById('file-import');
    let file = uploadInput.files[0];
    let table = document.getElementById('mapping-tbody');
    let rows = table.children;
    let mapper = {};
    for(let i=0; i < rows.length; i++){
        let row = rows[i];
        let mappedFrom = row.children[0].textContent;
        let mappedTo = row.children[1].children[0].value;
        mapper[mappedFrom] = mappedTo;
    }
    console.log(mapper)
    Papa.parse(file, {
        header: true,
        complete: function (results) {
             mapJsonFields(results.data, mapper);
            console.log(results.data)
            // sendNewDatasetToDb(results.data)
            if(results.errors.length > 0) {
                console.log('Error parsing data:', results.errors);
            }
        }
    });

    async function sendNewDatasetToDb(data){
        let url_string = SCRIPT_ROOT + 'save-dataset';
        let response = await postData(url_string, data);
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
    }

    function mapJsonFields(json, mapper){
        for(let i=0; i < json.length; i++){
            let row = json[i];
            Object.keys(row).forEach(function(oldKey){
                let newKey = mapper[oldKey];
                if(newKey == 'ignore'){
                    delete row[oldKey];
                } else {
                    delete Object.assign(row, {[newKey]: row[oldKey] })[oldKey];    //rename key
                }
            });
        }
        return json;
    }
}

async function postData(url = '', data = {}) {
    // Default options are marked with *
    const response = await fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json'
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow', // manual, *follow, error
      referrer: 'no-referrer', // no-referrer, *client
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    });
    return await response.json(); // parses JSON response into native JavaScript objects
  }






function completeDataUpload(){
    // console.log(state.filePendingUpload);

    Papa.parse(state.filePendingUpload, {
        complete: function (results) {
            let data = results.data;
            addDataToGeoJson(data, 'state');
        }
    });
}

function addDataToGeoJson(data, geoLevel, ignoreIndexes, normalizeIndexes){        // data must be 2-dimensional array with headers as first row and geo data as first column
    // console.log(data)
    headers = data[0];
    if(geoLevel==='state'){
        let newProperties = headers.slice(1);
        // console.log(state.stateData.choropleth_properties.concat(newProperties))
        state.stateData.choropleth_properties = state.stateData.choropleth_properties.concat(newProperties);
        // console.log(state.stateData.choropleth_properties)
        data.forEach(function(stateRow){
            let stateName = stateRow[0];
            let geoIndex = state.stateData.features.findIndex(function(geoObject){
                // console.log(geoObject)
                return geoObject.properties.STUSPS == stateName;
            });
            if(geoIndex < 0){
                console.log('could not find state:', stateName);
                return null;
            };
            // console.log(geoIndex)
            // console.log(state.stateData.features[geoIndex])
            for(let i=1; i<stateRow.length; i++){
                propertyName = headers[i];
                propertyValue = stateRow[i];
                
                state.stateData.features[geoIndex].properties[propertyName] = propertyValue;
            }
        });
    }
    console.log(state.stateData.choropleth_properties);
    state.filePendingUpload = null;
    load_map_attribute_selections(geoLevel);
    document.getElementById('close-modal-button').click();
    document.getElementById('modal-upload-starting-form').style.visibility = 'visible';
    removeChildren('import-modal-field-mapper');
}

function showFileUploadOptions() {
    let uploadInput = document.getElementById('file-import');
        let file = null;
        if (uploadInput.files.length > 0) {
            file = uploadInput.files[0];
        };
        if (!file) {
            console.log('no file!');
            return null;
        };
    state.filePendingUpload = file;
    populateFormWithParsedData(file, 'import-modal-field-mapper');
}

function populateFormWithParsedData(file, elementId) {
    Papa.parse(file, {
        preview: 5,
        complete: function (results) {
            let data = results.data;
            element = document.getElementById(elementId);
            document.getElementById('modal-upload-starting-form').style.visibility = 'hidden';
            appendFieldMapper(data, element);
            appendUploadAsTable(data, element);
        }
    });
}

function removeChildren(id){
    let el = document.getElementById(id);
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    return el;
}

function appendFieldMapper(data, element){
    let form = document.createElement('form');
    form.setAttribute('id', 'field-mapper-form');
    element.appendChild(form);
    let fieldNames = data[0];
    let headerDiv = document.createElement('div');
    headerDiv.className = 'row field-mapper-headers';
    form.appendChild(headerDiv);
    let fieldNameHeader = document.createElement('div');
    fieldNameHeader.className = 'col-sm-3';
    fieldNameHeader.textContent = 'Imported Field';
    headerDiv.appendChild(fieldNameHeader);
    let displayNameHeader = document.createElement('div');
    displayNameHeader.className = 'col-sm-3';
    displayNameHeader.textContent = 'Display Name';
    headerDiv.appendChild(displayNameHeader);
    let geoHeader = document.createElement('div');
    geoHeader.className = 'col-sm-2';
    geoHeader.textContent = 'Geographic Indicator';
    headerDiv.appendChild(geoHeader);
    let ignoreHeader = document.createElement('div');
    ignoreHeader.className = 'col-sm-2';
    ignoreHeader.textContent = 'Ignore This Field';
    headerDiv.appendChild(ignoreHeader);
    let normalizeHeader = document.createElement('div');
    normalizeHeader.className = 'col-sm-2';
    normalizeHeader.textContent = 'Normalize by Population';
    headerDiv.appendChild(normalizeHeader);
    

    for(let i=0; i<fieldNames.length; i++){
        let outerDiv = document.createElement('div');
        outerDiv.className = 'form-group row';
        form.appendChild(outerDiv);
        let label = document.createElement('label');
        label.className = 'col-sm-3 col-form-label';
        label.textContent = fieldNames[i];
        outerDiv.appendChild(label);
        let displayNameDiv = document.createElement('div');
        displayNameDiv.className = 'col-sm-3';
        outerDiv.appendChild(displayNameDiv);
        let displayNameInput = document.createElement('input');
        displayNameInput.className = 'form-control'
        displayNameInput.setAttribute('type', 'text');
        displayNameInput.setAttribute('value', fieldNames[i].slice(0,30))
        displayNameInput.setAttribute('maxlength', '30');
        displayNameDiv.appendChild(displayNameInput);
        let geoFieldDiv = document.createElement('div');
        geoFieldDiv.className = 'col-sm-2 radio-div';
        outerDiv.appendChild(geoFieldDiv);
        let geoFieldInput = document.createElement('input');
        geoFieldInput.className = 'form-check-input';
        geoFieldInput.setAttribute('type', 'radio');
        geoFieldInput.setAttribute('name', 'geoRadio');
        geoFieldDiv.appendChild(geoFieldInput);
        let ignoreDiv = document.createElement('div');
        ignoreDiv.className = 'col-sm-2 checkmark-div';
        outerDiv.appendChild(ignoreDiv);
        let ignoreInput = document.createElement('input');
        ignoreInput.className = 'form-check-input';
        ignoreInput.setAttribute('type', 'checkbox');
        ignoreDiv.appendChild(ignoreInput);
        let normalizeDiv = document.createElement('div');
        normalizeDiv.className = 'col-sm-2 checkmark-div';
        outerDiv.appendChild(normalizeDiv);
        let normalizeInput = document.createElement('input');
        normalizeInput.className = 'form-check-input';
        normalizeInput.setAttribute('type', 'checkbox');
        normalizeDiv.appendChild(normalizeInput);
    }

}

function appendUploadAsTable(data, element) {
    let div = document.createElement('div');
    div.className = 'row data-sample-title';
    div.textContent = 'Data Sample:'
    element.appendChild(div);
    let tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    element.appendChild(tableWrapper);
    let table = document.createElement('table');
    table.className = 'table table-sm data-table'
    tableWrapper.appendChild(table);
    let thead = document.createElement('thead');
    thead.className = 'thead-light';
    table.appendChild(thead);
    let tr = document.createElement('tr');
    thead.appendChild(tr);
    let tableHeaders = data[0];
    for (let k = 0; k < tableHeaders.length; k++) {
        let th = document.createElement('th');
        th.textContent = tableHeaders[k];
        tr.appendChild(th);
    }
    let tbody = document.createElement('tbody');
    table.appendChild(tbody);
    for (let i = 1; i < data.length; i++) {
        let tr = document.createElement('tr');
        tbody.appendChild(tr);
        let rowData = data[i];
        for (let j = 0; j < rowData.length; j++) {
            let td = document.createElement('td');
            td.textContent = rowData[j];
            tr.appendChild(td);
        }
    }
    uploadButton = document.getElementById('upload-file-button');
    uploadButton.textContent = 'Complete Upload';
}

