import React, {useState} from 'react';
import { Button, Tooltip } from 'antd';
import { Card } from 'antd';
import { Row, Col } from 'antd';
import { Input } from 'antd';
import { Select } from 'antd';
import { EditTwoTone, DownloadOutlined, UndoOutlined, SaveOutlined } from '@ant-design/icons'
import shortid from 'shortid';
import useClippy from 'use-clippy';
import './App.css';

function App() {
  const { TextArea } = Input;
  const { Option } = Select;

  const [ urlInput, setUrlInput ] = useState('');
  const [ urlList, setUrlList ] = useState([]);
  const [ urlSelected, setSelect ] = useState({});

  const [ clipboard, setClipboard ] = useClippy();

  const [ isLoading, setLoading ] = useState(true);

  // convert utf-8 encoded base64
  const Base64 = {
    encode: function(s) {
      return btoa(unescape(encodeURIComponent(s)));
    },
    decode: function(s) {
      return decodeURIComponent(escape(atob(s)));
    }
  };

  const urlType = (text) => {
    if(text.startsWith('vmess://')){
      return 'vmess';
    }else if (text.startsWith('trojan://')){
      return 'trojan';
    }else if ((text.startsWith('ss://'))){
      return 'ss';
    }else {
      return 'unsupported';
    }
  }

  const urlJson = (text) => {
    if(urlType(text) === 'vmess'){
      return JSON.parse(Base64.decode(text.replace('vmess://','')));
    }else if(urlType(text) === 'ss'){
      const starIndex = text.search('#');
      return Base64.decode( text.slice(5,starIndex))
      // chacha20-ietf:password@mydomain.com:8888
    }else {
      return text
    }
  }

  const urlName = (text) => {
    if(urlType(text) === 'vmess'){
      return urlJson(text)['ps'];
    }else if (urlType(text) === 'trojan'){
      const starIndex = text.search('#');
      return decodeURIComponent(text.slice(starIndex+1));
    }else if (urlType(text) === 'ss'){
      const starIndex = text.search('#');
      return decodeURIComponent(text.slice(starIndex+1));
    }
  }

  const isValidB64 = (text) => {
    const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    return base64regex.test(text);
  }

  const decodeB64 = (text) => {
    if(text.length && isValidB64(text)){
      const list = Base64.decode(text).split('\n');
      const urls = [];
      for (let item of list){
        let urlItem = { 'type': urlType(item), 'name': urlName(item),
        'json': urlJson(item), 'id': shortid.generate() };
        urls.push(urlItem);
      }
      setUrlList(urls);
      console.log(urls);
      return urls;
    }
  }

  const encodeB64 = (arr) => {
    console.log(arr);
    let urlOutput = '';
    for (let i=0; i<arr.length; ++i){
      const url = arr[i];
      if(url.type === 'vmess'){
        let newUrl = JSON.parse(JSON.stringify(url.json));
        newUrl.ps = url.name;
        urlOutput += 'vmess://' + Base64.encode(JSON.stringify(newUrl));
      }else if(url.type === 'trojan'){
        const starIndex = url.json.search('#')
        urlOutput += url.json.slice(0,starIndex) + '#' + encodeURIComponent(url.name);
      }else if(url.type === 'ss'){
        const starIndex = url.json.search('#')
        urlOutput += 'ss://' + url.json.slice(0,starIndex) + '#' + encodeURIComponent(url.name);
      }else {
        continue;
      }
      if ( i+1 < arr.length) {
        urlOutput += '\n';
      }
    }
    console.log(Base64.encode(urlOutput));
    return Base64.encode(urlOutput);
  }

  const inputOnChange = (e) => {
    setUrlInput(e.target.value);
    const urls = decodeB64(e.target.value);
    if (urls){
      setLoading(false);
    }
    
  }

  const importFromClipboard = () => {
    const pastedItem = clipboard;
    setUrlInput(pastedItem);
    const urls = decodeB64(pastedItem);
    if (urls){
      setLoading(false);
    }
  }

  const selectOnChange = (e) => {
    setSelect(urlList[urlList.findIndex(x => x.id === e)]);
  }

  const editNameOnInput = (e) => {
    setSelect({...urlSelected, name: e.target.value });
  }

  const editNameOnClick = () => {
    // Mapping the old array into a new one, swapping what you want to change for an updated item along the way.
    setUrlList(urlList.map(item => item.id === urlSelected.id ? {...item, name: urlSelected.name }: item));
  }

  const editButton = (
    <Tooltip placement="bottom" title="修改" arrowPointAtCenter>
    <Button type="link" icon={<EditTwoTone/>} size="small" onClick={editNameOnClick}/>
  </Tooltip>)

  const saveOnClick = () => {
    const output = encodeB64(urlList);
    setUrlInput(output);
  }

  return (
    <div className="App">
      <Row gutter={16} justify={"space-around"}>
        <Col span={12}>
          <Card >
            <Row justify={"center"} style={{marginBottom: 16}}>
            <Select loading={isLoading || !urlInput.length} style={{width: "60%"}} onChange={selectOnChange}>
              { urlList.map( (item) => (<Option key={item.id}><b>[{item.type}]</b> {item.name}</Option>) ) }
            </Select>
            </Row>
            <Row justify={"center"} style={{marginBottom: 16}}>
              <Input addonAfter={editButton} value={urlSelected.name} onChange={editNameOnInput} style={{width: "60%"}}/>
            </Row>
            <Row gutter={24} justify={"center"}>
              <Col>
              <Button type="primary" icon={<UndoOutlined />}>復原</Button>
              </Col>
              <Col>
              <Button type="primary" icon={<SaveOutlined />} onClick={saveOnClick}>保存</Button>
              </Col>
              <Col>
              <Button type="primary" icon={<DownloadOutlined />}>匯出</Button>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <TextArea rows={4} onChange={inputOnChange} value={urlInput} style={{marginBottom: 16}}/>
            <Button type="primary" block onClick={importFromClipboard}>從剪貼版導入</Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default App;
