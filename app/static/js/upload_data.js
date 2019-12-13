import { deleteChildrenById, postData } from './helpers.js';

function addUploadEventListener() {
    let fileSelectInput = document.getElementById('file-import');
    fileSelectInput.onclick = function(){
        clearModal();
    };
    fileSelectInput.onchange = function(){
        displayFieldMapper(fileSelectInput);
        document.getElementById('upload-file-button').disabled=false;
    };
    document.getElementById('import-button').addEventListener('click', clearModal);
    document.getElementById('upload-file-button').addEventListener('click', uploadDataset);

    var selectorBoxes = document.getElementsByClassName("format-selector-box");
    Array.from(selectorBoxes).forEach(function(element) {
        element.addEventListener('click', selectDataFormat);
    });
}

function selectDataFormat(e){
    clearDataFormatSelection();
    let node = e.target.closest('.format-selector-box');
    node.classList.add('format-selector-box-selected');
    let formatStyle = node.dataset.dataFormat;
    document.getElementById('field-mapper').dataset.dataFormat = formatStyle;
    let fileSelectInput = document.getElementById('file-import');
    displayFieldMapper(fileSelectInput);
}

function clearDataFormatSelection(){
    let selectorBoxes = document.getElementsByClassName("format-selector-box");
    Array.from(selectorBoxes).forEach(function(element) {
        element.classList.remove('format-selector-box-selected');
    });
}


function displayFieldMapper(uploadInput){
    let file = uploadInput.files[0];
    if(!file){return;}
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
                if( table.dataset.dataFormat == '1'){
                    labelCell.innerHTML = ('<select class="field-label">' +
                                        '<option value="ignore">ignore</option>' +
                                        '<option value="geographic-label">Geographic Label</option>' +
                                        '<option value="attribute-name">Attribute Name</option>' +
                                        '<option value="attribute-value">Attribute Value</option>' +
                                        '<option value="attribute-year">Attribute Year</option>' +
                                        '</select>');
                } else {
                    labelCell.innerHTML = ('<select class="field-label">' +
                                        '<option value="ignore">ignore</option>' +
                                        '<option value="geographic-label">Geographic Label</option>' +
                                        '<option value="attribute">Attribute</option>' +
                                        '<option value="attribute-year">Attribute Year</option>' +
                                        '</select>');
                }
                
                row.appendChild(nameCell);
                row.appendChild(labelCell);
                tbody.appendChild(row);

            });
        }
    });
}

function clearModal(){
    deleteChildrenById('field-mapper');
    document.getElementById('file-import').value = '';
    document.getElementById('file-import').value = '';
    document.getElementById('dataset-name').value = '';
    document.getElementById('dataset-description').value = '';
    document.getElementById('dataset-org').value = '';
    document.getElementById('dataset-url').value = '';
    document.getElementById('dataset-year').value = '';
    document.getElementById('dataset-private').checked = false;
    document.getElementById('upload-file-button').disabled=true;
    document.getElementById('import-error-message').textContent = '';
    clearDataFormatSelection();
}

async function uploadDataset(){
    document.getElementById('import-error-message').textContent = '';
    let validationResult = validateData();
    if(!validationResult.ok){
        let errorDiv = document.getElementById('import-error-message');
        errorDiv.style.color = 'red';
        errorDiv.textContent = validationResult.msg;
        return;
    }
    let uploadInput = document.getElementById('file-import');
    let file = uploadInput.files[0];
    let metadata = buildMetadataObject();
    let overrideYear = metadata.year ? metadata.year : null;
    let keys = getDataKeys();
    let formatStyle = document.getElementById('field-mapper').dataset.dataFormat;
 
    Papa.parse(file, {
        header: true,
        complete: function (results) {
            let data = transformUploadData(results.data, keys, formatStyle, overrideYear);
            let json = {};
            json.metadata = metadata;
            json.data = data;
            saveNewDataset(json);
            console.log(json)
        }
    });

    async function saveNewDataset(dataset){
        const url_string = SCRIPT_ROOT + 'datasets/save';
        const response = await postData(url_string, dataset);
        if(response.success){
            window.location.reload();
        } else {
            let errorDiv = document.getElementById('import-error-message');
            errorDiv.style.color = 'red';
            errorDiv.innerHTML = 'There was an error importing this file.  If this problem persists you can contact us through our <a href="/support">support page.</a>';
            document.getElementById('upload-file-button').disabled=true;
        }
    }

    function transformUploadData(data, keys, sourceFormatStyle, overrideYear=null){
        let transformedData = [];
        for(let row of data){
            if(sourceFormatStyle == '1'){
                let newRow = {};
                newRow['attribute-name'] = row[keys.nameKey].replace(/\s\s+/g, ' ');
                newRow['attribute-value'] = row[keys.valueKey].replace(/\s\s+/g, ' ').replace(/,/g,'');
                newRow['geographic-label'] = row[keys.geoKey].replace(/\s\s+/g, ' ');
                newRow['attribute-year'] = overrideYear ? overrideYear : row[keys.yearKey];
                transformedData.push(newRow);
            } else {
                for(let key of keys.attributeKeys){
                    let newRow = {};
                    newRow['attribute-name'] = key.replace(/\s\s+/g, ' ');
                    newRow['attribute-value'] = row[key].replace(/\s\s+/g, ' ').replace(/,/g,'');
                    newRow['geographic-label'] = row[keys.geoKey].replace(/\s\s+/g, ' ');
                    newRow['attribute-year'] = overrideYear ? overrideYear : row[keys.yearKey];
                    transformedData.push(newRow);
                }
            } 
        }
        return transformedData;        
    }

    function getDataKeys(){
        let table = document.getElementById('mapping-tbody');
        let rows = table.children;
        let keys = {};
        keys.attributeKeys = [];
        keys.yearKey = null;
        for(let i=0; i < rows.length; i++){
            let row = rows[i];
            let fieldName = row.children[0].textContent;
            let selectedLabel = row.children[1].children[0].value;
            if( selectedLabel == 'attribute' ){
                keys.attributeKeys.push(fieldName);
            } else if( selectedLabel == 'geographic-label'){
                keys.geoKey = fieldName;
            } else if( selectedLabel == 'attribute-year'){
                keys.yearKey = fieldName;
            } else if( selectedLabel == 'attribute-name'){
                keys.nameKey = fieldName;
            } else if( selectedLabel == 'attribute-value'){
                keys.valueKey = fieldName;
            }
        }
        return keys;
    }

    function buildMetadataObject(){
        let metadata = {};
        metadata.name = document.getElementById('dataset-name').value;
        metadata.description = document.getElementById('dataset-description').value;
        metadata.organization = document.getElementById('dataset-org').value;
        metadata.url = document.getElementById('dataset-url').value;
        metadata.year = document.getElementById('dataset-year').value;
        metadata.is_public = !document.getElementById('dataset-private').checked;
        return metadata;
    }

    function validateData(){
        let result = {};
        result.ok = true;
        result.msg = '';
        let table = document.getElementById('mapping-tbody');
        let dataFormat = document.getElementById('field-mapper').dataset.dataFormat;
        let year = document.getElementById('dataset-year').value;
        let rows = table.children;
        let selectedLabels = [];
        for(let row of rows){
            let selectedLabel = row.children[1].children[0].value;
            selectedLabels.push(selectedLabel);
        }
        if( selectedLabels.indexOf('geographic-label') == -1 ){
            result.ok = false;
            result.msg += 'A Geographic Label field must be selected.  ';
        }
        if( selectedLabels.filter( label => label == 'geographic-label') > 1 ){
            result.ok = false;
            result.msg += 'A Geographic Label field must be selected only once.  ';
        }
        if( dataFormat == '1' && selectedLabels.indexOf('attribute-name') == -1){
            result.ok = false;
            result.msg += 'An Attribute Name field must be selected.  ';
        }
        if( dataFormat == '1' && selectedLabels.filter( label => label == 'attribute-name') > 1 ){
            result.ok = false;
            result.msg += 'An Attribute Name field must be selected only once.  ';
        }
        if( dataFormat == '1' && selectedLabels.indexOf('attribute-value') == -1){
            result.ok = false;
            result.msg += 'An Attribute Value field must be selected.  ';
        }
        if( dataFormat == '1' && selectedLabels.filter( label => label == 'attribute-value') > 1 ){
            result.ok = false;
            result.msg += 'An Attribute Value field must be selected only once.  ';
        }
        if( dataFormat == '2' && selectedLabels.indexOf('attribute') == -1){
            result.ok = false;
            result.msg += 'An Attribute field must be selected.  ';
        }
        if( dataFormat == '2' && selectedLabels.filter( label => label == 'attribute') > 1 ){
            result.ok = false;
            result.msg += 'An Attribute field must be selected only once.  ';
        }
        if( !dataFormat ){
            result.ok = false;
            result.msg += 'You must select the format of your source data.  ';
        }
        if( year && (isNaN(year) || year<0 || year>2100) ){
            result.ok = false;
            result.msg += 'The provided year is not valid.';
        }
        return result;
    }

}


export { addUploadEventListener };