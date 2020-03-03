import React, {useState} from 'react';
import { Button, Tooltip } from 'antd';
import { Card } from 'antd';
import { Row, Col } from 'antd';
import { Input } from 'antd';
import { Select } from 'antd';
import { Layout } from 'antd';
import { Modal } from 'antd';
import { message } from 'antd';
import { EditTwoTone, DeleteOutlined, DownloadOutlined, UndoOutlined, SaveOutlined } from '@ant-design/icons';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import shortid from 'shortid';
import useClippy from 'use-clippy';
import axios from 'axios';
import './App.css';
import { Logo } from './img';

function App() {
  const { TextArea } = Input;
  const { Option } = Select;
  const { Content, Footer } = Layout;
  const { confirm } = Modal;

  const [ base64Input, setBase64Input ] = useState('');
  const [ textInput, setTextInput ] = useState('');
  const [ subscribeInput, setSubscribeInput ] = useState('');

  const [ urlList, setUrlList ] = useState([]);
  const [ urlSelected, setUrlSelect ] = useState({});

  const [ clipboard, setClipboard ] = useClippy();

  const [ isLoading, setLoading ] = useState(true);

  const [ inputActive, setInputActive ] = useState('BASE64');

  const supportedType = ['vmess','trojan','ss'];

  const inputTabList = [{key: 'BASE64', tab: 'BASE64'}, {key: 'TEXT', tab: 'TEXT'}, {key: 'URL', tab: 'URL'}]

  // convert utf-8 encoded base64
  const Base64 = {
    encode: (s) => {
      return btoa(unescape(encodeURIComponent(s)));
    },
    decode: (s) => {
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
        let urlItem = { type: urlType(item), name: urlName(item),
        json: urlJson(item), raw: item, id: shortid.generate() };
        urls.push(urlItem);
      }
      setUrlList(urls);
      setUrlSelect(urls[0]);
      console.log(urls);
      return urls;
    }else {
      return text;
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
    setClipboard(Base64.encode(urlOutput));
    message.success('新鏈接己生成');
    return Base64.encode(urlOutput);
  }

  const getUrlList = (text_b64) => {
    try{
      if(isValidB64(text_b64)) {
        //function decodeB64 will decode base64 format urls and create a urlList array
        const urls = decodeB64(text_b64);
        if (urls && urls.filter(x => supportedType.includes(x.type)).length > 0){
          setLoading(false);
        }
      }
    }catch(err) {
      console.log(err);
    }
  }

  const inputOnChange = {
    base64: (e) => {
      setBase64Input(e.target.value);
      if(isValidB64(e.target.value)) {
        try{
          setTextInput(Base64.decode(e.target.value));
          getUrlList(e.target.value);
        }catch(err){
          console.error(err);
        }
      }
    },
    text: (e) => {
      setTextInput(e.target.value);
      const text_b64 = Base64.encode(e.target.value);
      setBase64Input(text_b64);
      getUrlList(text_b64);
    },
    subscribe: (e) => {
      setSubscribeInput(e.target.value);
      const key = 'fetching';
      message.loading({ content: '導入訂閱鏈接中', key });
      axios.get(e.target.value)
      .then(res => {return res.data;})
      .then(x => {setBase64Input(x); return Base64.decode(x);})
      .then(x => {setTextInput(x); return Base64.encode(x)})
      .then(x => {getUrlList(x);  message.success({ content: '導入成功！', key, duration: 2 }); })
      .catch(err => {console.error(err); message.warning({ content: '導入失敗', key, duration: 2 }); });
    }
  }

  const importFromClipboard = {
    base64: () => {
      setBase64Input(clipboard);
      if(isValidB64(clipboard)) {
        try{
          setTextInput(Base64.decode(clipboard));
          getUrlList(clipboard);
        }catch(err){
          console.error(err);
        }
      }
    },
    text: () => {
      setTextInput(clipboard);
      const text_b64 = Base64.encode(clipboard);
      setBase64Input(text_b64);
      getUrlList(text_b64);
    }
  }

  const selectOnChange = (e) => {
    //console.log(e);
    setUrlSelect(urlList[urlList.findIndex(x => x.id === e[1])]);
  }

  const editNameOnInput = (e) => {
    setUrlSelect({...urlSelected, name: e.target.value });
  }

  const editNameOnClick = () => {
    // Mapping the old array into a new one, swapping what you want to change for an updated item along the way.
    setUrlList(urlList.map(item => item.id === urlSelected.id ? {...item, name: urlSelected.name }: item));
  }

  const editButton = (
    <Tooltip placement="bottom" title="修改" arrowPointAtCenter>
    <Button type="link" icon={<EditTwoTone/>} size="small" disabled={isLoading || !base64Input.length} onClick={editNameOnClick}/>
  </Tooltip>)

  const saveOnClick = () => {
    editNameOnClick();
    const output = encodeB64(urlList);
    setBase64Input(output);
  }

  const redoOnClick = () => {
    const orignalName = urlName(urlList[urlList.findIndex(x => x.id === urlSelected.id)].raw);
    setUrlSelect({...urlSelected, name: orignalName });
    setUrlList(urlList.map(item => item.id === urlSelected.id ? {...item, name: orignalName }: item));
  }

  const deleteOnClick = () => {
    confirm({
      title: '確定要刪除' + urlSelected.name + '?' ,
      icon: <ExclamationCircleOutlined />,
      content: '這項操作無法復原',
      okText: '確定',
      cancelText: '取消',
      onOk() {
        //console.log(urlSelected);
        performDelete(urlSelected);
        //console.log('OK');
      },
      onCancel() {
        //console.log('Cancel');
      },
    });
  }

  const performDelete = (obj) => {
    const old_select_index = urlList.findIndex(x => x.id === obj.id);
    // move pointer
    if(urlList.filter(item => item.id !== obj.id).length){
      setUrlSelect(urlList[(old_select_index+1)%urlList.length]);
    }else {
      setUrlSelect({});
    }
    
    //delete
    setUrlList(urlList.filter(item => item.id !== obj.id));

    message.success('刪除 ' + obj.name + ' 成功');
  }

  const getLogo = (type) => {
    const logo = {
      vmess: (<img src={Logo.v2ray} alt="" class="logo-wrap"></img>),
      trojan: (<img src={Logo.trojan} alt="" class="logo-wrap"></img>),
      ss: (<img src={Logo.ss} alt="" class="logo-wrap"></img>)
    };
    console.log(logo[type]);
    return logo[type];
  }

  const inputTabContent = {
    BASE64: (<Row gutter={[0,16]}>
      <Col span={24}><TextArea rows={4} autosize={false} onChange={inputOnChange.base64} value={base64Input}/></Col>
      <Col span={24} style={{marginBottom: -21}}><Button type="primary" block onClick={importFromClipboard.base64}>從剪貼版導入</Button></Col></Row>),
    TEXT: (<Row gutter={[0,16]}>
      <Col span={24}><TextArea rows={4} autosize={false} onChange={inputOnChange.text} value={textInput}/></Col>
      <Col span={24} style={{marginBottom: -21}}><Button type="primary" block onClick={importFromClipboard.text}>從剪貼版導入</Button></Col></Row>),
    URL: (<Row gutter={[0,16]}>
      <Col span={24}><TextArea rows={4} autosize={false} onChange={inputOnChange.subscribe} value={subscribeInput}/></Col>
      <Col span={24} style={{marginBottom: -21}}><Button type="primary" block onClick={importFromClipboard.subscribe}>從剪貼版導入</Button></Col></Row>)
  }

  return (
    <div className="App">
      <Layout>
      <Row justify={"center"}>
        <h2>Shawdowrockets 訂閱鏈接編輯器</h2>
      </Row>
      <Content>
      <Row gutter={[16,16]} justify={"space-between"}>
        <Col xs={24} sm={24} md={12}>
          <Card title="快速操作" bordered={false}>
            <Row gutter={[16,24]} justify={"center"} style={{height: 60}}>
              <Col xs={16} sm={16} md={14}>
              <Select showSearch value={urlList.length? urlSelected.name: ''} disabled={isLoading || !base64Input.length} style={{width: "100%"}} onChange={selectOnChange}
              filterOption={ (input,option) => option.children[2].toLowerCase().indexOf(input.toLowerCase()) >= 0  }>
              { urlList.map( (item) => (<Option key={item.id} value={[item.name,item.id]}>{getLogo(item.type)} {item.name}</Option>) ) }
              </Select>
            </Col>
            <Col xs={4} sm={4} md={2}>
            <Button type="primary" disabled={isLoading ||!base64Input.length} icon={<DeleteOutlined />} onClick={deleteOnClick} danger/>
            </Col>
            </Row>
            <Row gutter={[16,24]} justify={"center"}>
              <Col xs={20} sm={20} md={16}>
              <Input addonAfter={editButton} value={urlSelected.name} disabled={isLoading || !base64Input.length} onChange={editNameOnInput} onPressEnter={editNameOnClick}/>
              </Col>
            </Row>
            <Row gutter={16} justify={"center"} style={{marginBottom: -8}}>
              <Col xs={12} sm={12} md={6}>
              <Button type="primary" icon={<UndoOutlined />} onClick={redoOnClick}>復原</Button>
              </Col>
              <Col xs={12} sm={12} md={6}>
              <Button type="primary" icon={<SaveOutlined />} onClick={saveOnClick}>保存</Button>
              </Col>
              <Col xs={0} sm={0} md={6}>
              <Button type="primary" icon={<DownloadOutlined />}>匯出</Button>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={12}>
          <Card tabList={inputTabList} activeTabKey={inputActive} onTabChange={key => setInputActive(key)}>{inputTabContent[inputActive]}</Card>
        </Col>
      </Row>
      </Content>
      <Footer>
      <Row justify={"center"}>
      Created by&nbsp; <a href="https:www.phlinhng.com">phlinhng</a>. &nbsp;All rights reserved.
      </Row>
      </Footer>
      </Layout>
    </div>
  );
}

export default App;
