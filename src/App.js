import React, {useState} from 'react';
import { Button, Input, Select, Radio, Switch } from 'antd';
import { Layout, Row, Col, Card } from 'antd';
import { Modal, message, Skeleton } from 'antd';
import { CheckOutlined, DeleteOutlined, DownloadOutlined, SaveOutlined, UndoOutlined  } from '@ant-design/icons';
import { ExclamationCircleOutlined, QuestionCircleTwoTone } from '@ant-design/icons';
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
  const InputGroup = Input.Group;

  const [ base64Input, setBase64Input ] = useState('');
  const [ textInput, setTextInput ] = useState('');
  const [ subscribeInput, setSubscribeInput ] = useState('');

  const [ urlList, setUrlList ] = useState([]);
  const [ urlPointer, setUrlSelect ] = useState(0); // index of selected item

  const [ clipboard, setClipboard ] = useClippy();

  const [ isLoading, setLoading ] = useState(true);

  const supportedType = ['ss','vmess','trojan'];

  const inputTabList = [{key: 'API', tab: 'API'}, {key: 'TEXT', tab: 'URL'}, {key: 'BASE64', tab: 'BASE64'} ];
  const [ inputActive, setInputActive ] = useState('API');
  
  const operateTabList = [{key: 'fastEdit', tab: '快速操作'}, {key: 'detailedEdit', tab: '詳細編輯'}];
  const [ operateActive, setOperateActive ] = useState('detailedEdit');

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
      return Base64.decode( text.slice(5,starIndex) );
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
      console.log('decodeB64',urls);
      return urls;
    }else {
      return text;
    }
  }

  const encodeB64 = (arr) => {
    //console.log('encodeB64',arr);
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
        urlOutput += 'ss://' + Base64.encode(url.json.slice(0,starIndex)) + '#' + encodeURIComponent(url.name);
      }else {
        continue;
      }
      if ( i+1 < arr.length) {
        urlOutput += '\n';
      }
    }
    //console.log(urlOutput.split('\n'));
    //console.log(Base64.encode(urlOutput));
    return Base64.encode(urlOutput);
  }

  const getUrlList = (text_b64) => {
    try{
      if(isValidB64(text_b64)) {
        //function decodeB64 will decode base64 format urls and create a urlList array
        //decodeB64(text_b64) is an array from original base64
        //urls is decodeB64(text_b64) skipping empty liines
        const urls = decodeB64(text_b64).filter(x => x.raw !== "");
        if (urls.length <  decodeB64(text_b64).length){
          setBase64Input(encodeB64(urls)); // update base64 input field if any empty line was skipped
          setTextInput(Base64.decode(encodeB64(urls)));
        }
        if (urls.filter(x => supportedType.includes(x.type)).length > 0){
          setUrlList(urls);
          //console.log('getUrlList',urls);
          setLoading(false);
          return urls;
        }else {
          return text_b64;
        }
      }
    }catch(err) {
      console.log(err);
    }
  }

  const isText = (content) => {
    const arr = content.split('\n');
    const validPrefix = /^(vmess|ss|trojan).*/;
    for(let item of arr){
      if(validPrefix.test(item)) {
        continue;
      }else {
        return false;
      }
    }
    return true;
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
      if(e.target.value === '') { return; }
      const text_b64 = Base64.encode(e.target.value);
      setBase64Input(text_b64);
      // if equals, mean that input text have not been transferred to urls array
      console.log(text_b64);
      if(getUrlList(text_b64) !== text_b64) { message.success('解析成功'); }
    },
    subscribe: (e) => {
      const content = e.target.value;
      setSubscribeInput(content);
      if(isText(content)) {
        setTextInput(content);
        if(e.target.value === '') { return; }
        const text_b64 = Base64.encode(content);
        setBase64Input(text_b64);
        // if equals, mean that input text have not been transferred to urls array
        console.log(text_b64);
        if(getUrlList(text_b64) !== text_b64) { message.success('解析成功'); }
      }else if(/(http|https).*/.test(content)){
        const key = 'fetching';
        message.loading({ content: '導入訂閱鏈接中', key });
        axios.get(e.target.value)
        .then(res => {return res.data;})
        .then(x => {setBase64Input(x); return Base64.decode(x);})
        .then(x => {setTextInput(x); return Base64.encode(x);})
        .then(x => {return getUrlList(x);})
      . then(x => {message.success({ content: '導入 ' + x.length + '個節點' + ' 成功', key, duration: 2 }); })
        .catch(err => {console.error(err); message.warning({ content: '導入失敗', key, duration: 2 }); });
      }
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

  const selectOnChange = (val) => {
    //console.log(e);
    setUrlSelect(urlList.findIndex(x => x.id === val[1]));
  }

  const saveOnClick = () => {
    const output = encodeB64(urlList);
    setBase64Input(output);
    setClipboard(output);
    message.success('New BASE64 copied');
  }

  const redoOnClick = () => {
    const orignalName = urlName(urlList[urlPointer].raw);
    const selectedId = urlList[urlPointer].id;
    setUrlList(urlList.map(item => item.id === selectedId ? {...item, name: orignalName }: item));
  }

  const deleteOnClick = () => {
    confirm({
      title: '確定要刪除' + urlList[urlPointer].name + '?' ,
      icon: <ExclamationCircleOutlined />,
      content: '這項操作無法復原',
      okText: '確定',
      cancelText: '取消',
      onOk() {
        //console.log(urlPointer);
        performDelete(urlList[urlPointer]);
        //console.log('OK');
      },
      onCancel() {
        //console.log('Cancel');
        console.log(urlList);
      },
    });
  }

  const performDelete = (obj) => {
    // move pointer first
    if(urlList.filter(item => item.id !== obj.id).length){
      setUrlSelect( (urlPointer+1)%urlList.length );
    }else {
      setUrlSelect(0);
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
    //console.log(logo[type]);
    return logo.hasOwnProperty(type)? logo[type]:(<QuestionCircleTwoTone />)
  }

  const editOnChange = {
    name: ( (e) => {
      const selectedId = urlList[urlPointer].id;
      // Mapping the old array into a new one, swapping what you want to change for an updated item along the way.
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, name: e.target.value }: item));
    }),
    net: ( (e) => {
      const new_net = e.target.value;
      if(urlList[urlPointer].json){
        const selectedId = urlList[urlPointer].id;
        if(new_net !== 'kcp'){
          setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net, type: "none"} }: item));
        }else if(new_net !== 'ws'){
          setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net, host: "", path: ""} }: item));
        }else{
          setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net} }: item));
        }
      }
    }),
    address : ((e) => {
      const selectedId = urlList[urlPointer].id;
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, add: e.target.value} }: item));
    }),
    port: ((e) => {
      const selectedId = urlList[urlPointer].id;
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, port: e.target.value} }: item));
    }),
    uuid: ((e) => {
      const selectedId = urlList[urlPointer].id;
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, id: e.target.value} }: item));
    }),
    aid: ((e) => {
      const selectedId = urlList[urlPointer].id;
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, aid: e.target.value} }: item));
    }),
    tls: ((checked, e) => {
      //console.log(e);
      const selectedId = urlList[urlPointer].id;
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, tls: checked? 'tls':'none' } }: item));
    }),
    ws: {
      host: ((e) => {
        const selectedId = urlList[urlPointer].id;
        if(urlList[urlPointer].json.net === 'ws'){
          setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, host: e.target.value} }: item));
        }else {
          return;
        }
      }),
      path: ((e) => {
        const selectedId = urlList[urlPointer].id;
        if(urlList[urlPointer].json.net === 'ws'){
          setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, path: e.target.value} }: item));
        }else{
          return;
        }
      })
    },
    type: ((val) => {
      const selectedId = urlList[urlPointer].id;
      if(urlList[urlPointer].json.net === 'kcp'){
        setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, type: val} }: item));
      }
    }),
  }

  const inputTabContent = {
    API: (<Row gutter={[0,16]}>
      <Col span={24}><TextArea rows={4} autosize={false} placeholder={'輸入訂閱網址'} onChange={inputOnChange.subscribe} value={subscribeInput}/></Col>
      <Col span={24} style={{marginBottom: -21}}><Button type="primary" block onClick={importFromClipboard.subscribe}>從剪貼版導入</Button></Col></Row>),
    TEXT: (<Row gutter={[0,16]}>
      <Col span={24}><TextArea rows={4} autosize={false} onChange={inputOnChange.text} value={textInput}/></Col>
      <Col span={24} style={{marginBottom: -21}}><Button type="primary" block onClick={importFromClipboard.text}>從剪貼版導入</Button></Col></Row>),
    BASE64: (<Row gutter={[0,16]}>
      <Col span={24}><TextArea rows={4} autosize={false} onChange={inputOnChange.base64} value={base64Input}/></Col>
      <Col span={24} style={{marginBottom: -21}}><Button type="primary" block onClick={importFromClipboard.base64}>從剪貼版導入</Button></Col></Row>)
  }

  const commonContent = {
    select: (<Select showSearch value={urlList[urlPointer]? [urlList[urlPointer].name,urlList[urlPointer].id]:''} disabled={isLoading || !base64Input.length} style={{width: "100%"}} onChange={selectOnChange}
    filterOption={ (input,option) => option.children[2].toLowerCase().indexOf(input.toLowerCase()) >= 0  }>
    { urlList.map( (item) => (<Option key={item.id} value={[item.name,item.id]}>{getLogo(item.type)} {item.name}</Option>) ) }
    </Select>),
    remark: (<Input placeholder="節點名稱(Remark)" addonAfter={urlList[urlPointer]? ( getLogo(urlList[urlPointer].type) ):(<QuestionCircleTwoTone />)}
    value={urlList[urlPointer]? urlList[urlPointer].name:''} disabled={isLoading || !base64Input.length} onChange={editOnChange.name} onPressEnter={editOnChange.name}/>),
    deleteIcon: (<Button type="primary" disabled={isLoading ||!base64Input.length} icon={<DeleteOutlined />} onClick={deleteOnClick} danger/>),
  }

  const detailedContent = {
    vmess: (<Row gutter={[16,24]}>
      <Col xs={24} sm={24} md={12} > {commonContent.select} </Col>
      <Col xs={20} sm={20} md={10}> {commonContent.remark} </Col>
      <Col xs={4} sm={4} md={2}> {commonContent.deleteIcon} </Col>
      <Col xs={24} sm={24} md={12}>
        <InputGroup compact>
        <Input style={{width: "75%", textAlign:"left"}} placeholder="服務器地址(Address)" onChange={editOnChange.address} value={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.add:''):''}></Input>
        <Input style={{width: "25%"}} placeholder="Port" placeholder="port" onChange={editOnChange.port} value={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.port:''):''}></Input>
        </InputGroup>
      </Col>
      <Col xs={24} sm={24} md={12}>
        <InputGroup compact>
        <Input style={{width: "75%"}} placeholder="UUID" onChange={editOnChange.uuid} value={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.id:''):''}></Input>
        <Input style={{width: "25%"}} placeholder="AID" onChange={editOnChange.aid} value={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.aid:''):''}></Input>
        </InputGroup>
      </Col>
      <Col xs={20} sm={20} md={10}>
        <Radio.Group style={{marginLeft: -24}} onChange={editOnChange.net} value={urlList[urlPointer]? (urlList[urlPointer].json? urlList[urlPointer].json.net:''):''}>
          <Radio key="tcp" value="tcp">TCP</Radio>
          <Radio key="ws" value="ws">WS</Radio>
          <Radio key="kcp" value="kcp">KCP</Radio>
        </Radio.Group>
      </Col>
      <Col xs={4} sm={4} md={2}>
        <Switch style={{marginLeft: -24}} checkedChildren="TLS" unCheckedChildren="TLS" onChange={editOnChange.tls}
        checked={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.tls === 'tls'):false):false}></Switch>
      </Col>
      <Col xs={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'ws'? 24:0):0):0}
      sm={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'ws'? 24:0):0):0}
      md={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'ws'? 12:0):0):0}>
      <InputGroup compact>
      <Input style={{width: "75%"}} placeholder="域名(Host)" onChange={editOnChange.ws.host} value={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.host:''):''}></Input>
      <Input style={{width: "25%"}} placeholder="path" onChange={editOnChange.ws.path} value={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.path:''):''}></Input>
      </InputGroup>
      </Col>
      <Col xs={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'kcp'? 24:0):0):0}
      sm={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'kcp'? 24:0):0):0}
      md={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'kcp'? 12:0):0):0}>
      <Select style={{width:"100%"}} onChange={editOnChange.type} value={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.type:''):''}>
        <Option key='none' value='none'>none (不偽裝)</Option>
        <Option key='wechat-video' value='wechat-video'> wechat-video (偽裝微信視頻) </Option>
        <Option key='srtp' value='srtp'>srtp (偽裝視頻通話)</Option>
        <Option key='utp' value='utp'>utp (偽裝BitTorrent下載) </Option>
        <Option key='dtls' value='dtls'>dlts (偽裝DLTS 1.2封包)</Option>
        <Option key='wireguard' value='wireguard'>wireguard (偽裝Wireguard封包)</Option>
      </Select>
    </Col>
    </Row>)
  }

  const operateTabContent = {
    fastEdit: (
    <Row gutter={[16,24]} justify={"center"}>
      <Col xs={16} sm={16} md={14} style={{height: 60}}> {commonContent.select} </Col>
      <Col xs={4} sm={4} md={2}> {commonContent.deleteIcon} </Col>
      <Col xs={24} sm={24} md={16}> {commonContent.remark} </Col>
    </Row>),
    detailedEdit: ( urlList[urlPointer]? (urlList[urlPointer].type === 'vmess'? detailedContent['vmess']:'目前僅支持vmess協議'):(<Skeleton/>)),
    buttons : ( <div><Button type="primary" icon={<CheckOutlined />} disabled={isLoading || !base64Input.length} onClick={saveOnClick}>生成</Button></div>)
  }

  return (
    <div className="App">
      <Layout>
        <Row justify={"start"} align={"middle"}>
          <Col xs={24} sm={24} md={6}><h2>Shawdowrockets 訂閱鏈接編輯器</h2></Col>
          <Col xs={0} sm={0} md={6} style={{marginLeft: -32}}><h3>支持 {supportedType.map( (x,index) => index < supportedType.length-1? x+', ':x)} 鏈接編輯</h3></Col>
        </Row>
        <Content>
        <Row gutter={[16,16]} justify={"space-between"} type="flex">
          <Col xs={24} sm={24} md={12}>
          <Card className="card" tabList={operateTabList} tabBarExtraContent={operateTabContent.buttons} activeTabKey={operateActive} onTabChange={key => setOperateActive(key)}>{operateTabContent[operateActive]}</Card>
          </Col>
          <Col xs={24} sm={24} md={12}>
            <Card className="card" tabList={inputTabList} activeTabKey={inputActive} onTabChange={key => setInputActive(key)}>{inputTabContent[inputActive]}</Card>
          </Col>
        </Row>
        </Content>
        <Footer style={{position: "sticky", bottom: 0}}>
        <Row>
          <Col span={24}>
          Created by {<a href="https:www.phlinhng.com">phlinhng</a>}. All rights reserved.
        </Col></Row>
        </Footer>
      </Layout>
    </div>
  );
}

export default App;
