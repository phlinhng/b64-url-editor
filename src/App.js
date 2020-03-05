import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Radio, Switch } from 'antd';
import { Layout, Row, Col, Card } from 'antd';
import { Badge, Modal, message, Skeleton } from 'antd';
import { CheckOutlined, DeleteOutlined, DownloadOutlined, SaveOutlined, UndoOutlined  } from '@ant-design/icons';
import { ExclamationCircleOutlined, QuestionCircleTwoTone } from '@ant-design/icons';
import shortid from 'shortid';
import useClippy from 'use-clippy';
import axios from 'axios';
import './App.css';
import { Logo } from './img';
import queryString from 'query-string';

function App() {
  useEffect ( () => {
    if(window.location.search){
      //const parsed = queryString.parse(window.location.search);
      //inputOnChange.subscribe({target:{value: parsed.sub }});
    }
  });

  const { TextArea } = Input;
  const { Option } = Select;
  const { Content, Footer } = Layout;
  const { confirm } = Modal;
  const InputGroup = Input.Group;

  const [ base64Input, setBase64Input ] = useState('');
  const [ textInput, setTextInput ] = useState('');
  const [ subscribeInput, setSubscribeInput ] = useState('');

  const [ urlList, setUrlList ] = useState([{}]);
  const [ urlPointer, setUrlSelect ] = useState(0); // index of selected item

  const [ clipboard, setClipboard ] = useClippy();

  const [ isLoading, setLoading ] = useState(true);
  const [ hasEdited, setHasEdited ] = useState(0);

  const supportedType = ['ss','vmess','trojan'];
  const validPrefix = /^(vmess|ss|trojan).*/;

  const inputTabList = [{key: 'API', tab: 'API'}, {key: 'TEXT', tab: 'URL'}, {key: 'BASE64', tab: 'BASE64'} ];
  const [ inputActive, setInputActive ] = useState('API');
  
  const operateTabList = [{key: 'fastEdit', tab: '快速操作'}, {key: 'detailedEdit', tab: '詳細編輯'}];
  const [ operateActive, setOperateActive ] = useState('fastEdit');

  const ssMethod = ['none','table','rc4','rc4-md5','rc4-md5-6','salsa20','chacha20','chacha20-ietf',
  'aes-256-cfb','aes-192-cfb','aes-128-cfb','aes-256-cfb1','aes-192-cfb1','aes-128-cfb1','aes-256-cfb8','aes-192-cfb8','aes-128-cfb8',
  'aes-256-ctr','aes-192-ctr','aes-128-ctr','bf-cfb','camellia-256-cfb','camellia-192-cfb','camellia-128-cfb',
  'cast5-cfb','des-cfb','idea-cfb','seed-cfb','aes-256-gcm','aes-192-gcm','aes-128-gcm',
  'chacha20-ietf-poly1305','chacha20-poly1305','xchacha20-ietf-poly1305'];

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
    return validPrefix.test(text)? text.slice(0,text.search('://')):'unsupported';
  }

  const text2json =  {
    vmess: ( (text) => {
      const vmess_json = JSON.parse(Base64.decode(text.replace('vmess://','')));
      return { type: urlType(text), json: vmess_json, raw: text, id: shortid.generate() };
    }),
    ss: ( (text) => {
      const starIndex = text.search('#');
      const ss_name = decodeURIComponent(text.slice(starIndex+1));
      const ss_link = Base64.decode(text.slice(5,starIndex)).split(/[@:]+/); // chacha20-ietf:password@mydomain.com:8888
      const ss_json = { id: ss_link[0], aid: ss_link[1], add: ss_link[2], port: ss_link[3], ps: ss_name };
      return { type: urlType(text), json: ss_json, raw: text, id: shortid.generate()}; //id: security method, aid: password
    }),
    trojan: ( (text) =>{
      const starIndex = text.search('#');
      const trojan_name = decodeURIComponent(text.slice(starIndex+1)); // trojan://[password]@[address]:[port]?peer=#[remark]
      const trojan_link = text.slice(9,starIndex-6).split(/[@:]+/);
      const trojan_json = { aid: trojan_link[0], add: trojan_link[1], port: trojan_link[2], ps: trojan_name }
      return {type: urlType(text), json: trojan_json, raw: text, id: shortid.generate()};
    }),
    unsupported: ( (text) => {
      return { type: urlType(text), json:{}, raw: text, id: shortid.generate() };
    }),
    isText: ( (text) => ( text.split(/[;\n]+/).every( x => validPrefix.test(x) ) ))
  }

  const json2text = {
    vmess: ( (json) => ( 'vmess://' + Base64.encode(JSON.stringify(json)) ) ),
    ss: ( (json) => {
      // chacha20-ietf:password@mydomain.com:8888
      // id: method, aid: password
      const ss_link = json.id + ':' + json.aid + '@' + json.add + ':' + json.port;
      return 'ss://' + Base64.encode(ss_link) + '#' + encodeURIComponent(json.ps);
    }),
    trojan: ( (json) => {
      // trojan://[password]@[address]:[port]?peer=#[remark]
      return 'trojan://' + json.aid + '@' + json.add + ':' + json.port + '?peer=#' + encodeURIComponent(json.ps);
    }),
    unsupported: ( (json) => json.raw )
  }

  const isValidB64 = (text) => {
    const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    return base64regex.test(text);
  }

  const decodeB64 = (text) => {
    if(text.length && isValidB64(text)){
      const url_list = Base64.decode(text).split(/[;\n]+/);
      const urls = url_list.map(x => text2json[urlType(x)](x));
      console.log('decodeB64',urls);
      return urls;
    }else {
      return text;
    }
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

  const encodeB64 = (arr) => ( Base64.encode( arr.map( x=> json2text[x.type](x.json) ).join('\n') ) );

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
      if(text2json.isText(content)) {
        setTextInput(content);
        if(e.target.value === '') { return; }
        const text_b64 = Base64.encode(content);
        setBase64Input(text_b64);
        // if equals, mean that input text have not been transferred to urls array
        console.log(text_b64);
        if(getUrlList(text_b64) !== text_b64) { message.success('解析成功'); }
      }else if(/^(http|https).*/.test(content)){
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
    base64: ( () => inputOnChange.base64({target:{value: clipboard}}) ) ,
    text: ( () => inputOnChange.text({target:{value: clipboard}}) ),
    subscribe: ( () => inputOnChange.subscribe({target:{value: clipboard}}) )
  }

  const selectOnChange = {
    item: ( (val) => {
      //console.log(e);
      setUrlSelect(urlList.findIndex(x => x.id === val[1]));
    })
  }

  const saveOnClick = () => {
    const output = encodeB64(urlList);
    setBase64Input(output);
    setTextInput(urlList.map(x => json2text[x.type](x.json) ).join('\n') );
    setClipboard(output);
    message.success('New BASE64 copied');
    setHasEdited(0);
  }

  const redoOnClick = () => {
    //const orignalName = urlName(urlList[urlPointer].raw);
    //const selectedId = urlList[urlPointer].id;
    //setUrlList(urlList.map(item => item.id === selectedId ? {...item, name: orignalName }: item));
  }

  const deleteOnClick = () => {
    confirm({
      title: '確定要刪除' + urlList[urlPointer].json.ps + '?' ,
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
    message.success('刪除 ' + obj.json.ps + ' 成功');
    setHasEdited(1);
  }

  const getLogo = (type) => {
    const logo = {
      vmess: (<img src={Logo.v2ray} alt="v2Ray" className="logo-wrap" />),
      trojan: (<img src={Logo.trojan} alt="trojan-gfw" className="logo-wrap" />),
      ss: (<img src={Logo.ss} alt="Shadowsocks" className="logo-wrap" />)
    };
    //console.log(logo[type]);
    return logo.hasOwnProperty(type)? logo[type]:(<QuestionCircleTwoTone />)
  }

  const editOnChange = {
    ps: ( (e) => {
      const selectedId = urlList[urlPointer].id;
      // Mapping the old array into a new one, swapping what you want to change for an updated item along the way.
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, ps: e.target.value } }: item));
      setHasEdited(1);
    }),
    net: ( (e) => {
      const new_net = e.target.value;
      if(urlList[urlPointer].json){
        const selectedId = urlList[urlPointer].id;
        if(new_net !== 'kcp'){
          setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net, type: "none"} }: item));
          setHasEdited(1);
        }else if(new_net !== 'ws'){
          setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net, host: "", path: ""} }: item));
          setHasEdited(1);
        }else{
          setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net} }: item));
          setHasEdited(1);
        }
      }
    }),
    address : ((e) => {
      const selectedId = urlList[urlPointer].id;
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, add: e.target.value} }: item));
      setHasEdited(1);
    }),
    port: ((e) => {
      const selectedId = urlList[urlPointer].id;
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, port: e.target.value} }: item));
      setHasEdited(1);
    }),
    uuid: ((e) => {
      const selectedId = urlList[urlPointer].id;
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, id: e.target.value} }: item));
      setHasEdited(1);
    }),
    aid: ((e) => {
      const selectedId = urlList[urlPointer].id;
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, aid: e.target.value} }: item));
      setHasEdited(1);
    }),
    tls: ((checked, e) => {
      //console.log(e);
      const selectedId = urlList[urlPointer].id;
      setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, tls: checked? 'tls':'none' } }: item));
      setHasEdited(1);
    }),
    ws: {
      host: ((e) => {
        const selectedId = urlList[urlPointer].id;
        if(urlList[urlPointer].json.net === 'ws'){
          setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, host: e.target.value} }: item));
          setHasEdited(1);
        }else {
          return;
        }
      }),
      path: ((e) => {
        const selectedId = urlList[urlPointer].id;
        if(urlList[urlPointer].json.net === 'ws'){
          setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, path: e.target.value} }: item));
          setHasEdited(1);
        }else{
          return;
        }
      })
    },
    type: ((val) => {
      const selectedId = urlList[urlPointer].id;
      if(urlList[urlPointer].json.net === 'kcp'){
        setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, type: val} }: item));
        setHasEdited(1);
      }
    }),
    ssMethod: ( (val) => {
      const selectedId = urlList[urlPointer].id;
      if(urlList[urlPointer].type === 'ss'){
        setUrlList(urlList.map(item => item.id === selectedId ? {...item, json: {...item.json, id: val} }: item));
        setHasEdited(1);
      }
    }),
  }

  const inputTabContent = {
    API: (<Row gutter={[0,16]}>
      <Col span={24}><TextArea rows={4} autosize={false} placeholder={'輸入訂閱網址或服務器鏈接'} onChange={inputOnChange.subscribe} value={subscribeInput}/></Col>
      <Col span={24} style={{marginBottom: -21}}><Button type="primary" block onClick={importFromClipboard.subscribe}>從剪貼版導入</Button></Col></Row>),
    TEXT: (<Row gutter={[0,16]}>
      <Col span={24}><TextArea rows={4} autosize={false} onChange={inputOnChange.text} value={textInput}/></Col>
      <Col span={24} style={{marginBottom: -21}}><Button type="primary" block onClick={importFromClipboard.text}>從剪貼版導入</Button></Col></Row>),
    BASE64: (<Row gutter={[0,16]}>
      <Col span={24}><TextArea rows={4} autosize={false} onChange={inputOnChange.base64} value={base64Input}/></Col>
      <Col span={24} style={{marginBottom: -21}}><Button type="primary" block onClick={importFromClipboard.base64}>從剪貼版導入</Button></Col></Row>)
  }

  const commonContent = {
    select: (<Select showSearch value={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? [urlList[urlPointer].json.ps,urlList[urlPointer].id]:''} disabled={isLoading || !base64Input.length} style={{width: "100%"}} onChange={selectOnChange.item}
    filterOption={ (input,option) => option.children[2].toLowerCase().indexOf(input.toLowerCase()) >= 0  }>
    { urlList.filter(x => supportedType.includes(x.type)).map( (item) => (<Option key={item.id} value={[item.json.ps,item.id]}>{getLogo(item.type)} {item.json.ps}</Option>) ) }
    </Select>),
    remark: (<Input placeholder="節點名稱 (Remark)" addonAfter={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('type')? ( getLogo(urlList[urlPointer].type) ):(<QuestionCircleTwoTone />)}
    value={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.ps:''} disabled={isLoading || !base64Input.length} onChange={editOnChange.ps} onPressEnter={editOnChange.ps}/>),
    deleteIcon: (<Button type="primary" disabled={isLoading ||!base64Input.length} icon={<DeleteOutlined />} onClick={deleteOnClick} danger/>),
    serverAddress: (<InputGroup compact>
    <Input style={{width: "75%", textAlign:"left"}} disabled={isLoading || !base64Input.length} placeholder="服務器地址 (Address)" onChange={editOnChange.address} value={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.add:''} />
    <Input style={{width: "25%"}} disabled={isLoading || !base64Input.length} placeholder="port" onChange={editOnChange.port} value={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.port:''} />
    </InputGroup>)
  }

  const detailedContent = {
    vmess: (<Row gutter={[16,24]}>
      <Col xs={24} sm={24} md={12} > {commonContent.select} </Col>
      <Col xs={20} sm={20} md={10}> {commonContent.remark} </Col>
      <Col xs={4} sm={4} md={2}> {commonContent.deleteIcon} </Col>
      <Col xs={24} sm={24} md={12}> {commonContent.serverAddress} </Col>
      <Col xs={24} sm={24} md={12}>
        <InputGroup compact>
        <Input style={{width: "75%"}} placeholder="UUID" onChange={editOnChange.uuid} value={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.id:''} />
        <Input style={{width: "25%"}} placeholder="AID" onChange={editOnChange.aid} value={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.aid:''} />
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
        checked={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.tls === 'tls'):false}></Switch>
      </Col>
      <Col xs={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'ws'? 24:0):0}
      sm={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'ws'? 24:0):0}
      md={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'ws'? 12:0):0}>
      <InputGroup compact>
      <Input style={{width: "75%"}} placeholder="域名 (Host)" onChange={editOnChange.ws.host} value={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.host:''):''} />
      <Input style={{width: "25%"}} placeholder="path" onChange={editOnChange.ws.path} value={urlList[urlPointer]? (urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.path:''):''} />
      </InputGroup>
      </Col>
      <Col xs={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'kcp'? 24:0):0}
      sm={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'kcp'? 24:0):0}
      md={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? (urlList[urlPointer].json.net === 'kcp'? 12:0):0}>
      <Select style={{width:"100%"}} onChange={editOnChange.type} value={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.type:''}>
        <Option key='none' value='none'>none (不偽裝)</Option>
        <Option key='wechat-video' value='wechat-video'> wechat-video (偽裝微信視頻) </Option>
        <Option key='srtp' value='srtp'>srtp (偽裝視頻通話)</Option>
        <Option key='utp' value='utp'>utp (偽裝BitTorrent下載) </Option>
        <Option key='dtls' value='dtls'>dlts (偽裝DLTS 1.2封包)</Option>
        <Option key='wireguard' value='wireguard'>wireguard (偽裝Wireguard封包)</Option>
      </Select>
    </Col>
    </Row>),
    ss: (<Row gutter={[16,24]}>
      <Col xs={24} sm={24} md={12}> {commonContent.select} </Col>
      <Col xs={20} sm={20} md={10}> {commonContent.remark} </Col>
      <Col xs={4} sm={4} md={2}> {commonContent.deleteIcon} </Col>
      <Col xs={24} sm={24} md={12}> {commonContent.serverAddress} </Col>
      <Col xs={24} sm={24} md={12}></Col>
      <Col xs={24} sm={24} md={12}>
        <Select showSearch style={{width: "100%"}} placeholder="加密方式 (Method)" onChange={editOnChange.ssMethod} value={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.id:''}
        filterOption={ (input,option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0  }>
          { ssMethod.map( x => (<Option key={x}>{x}</Option>) )}
        </Select>
      </Col>
      <Col xs={24} sm={24} md={12}>
        <Input.Password placeholder="密碼 (Password)" onChange={editOnChange.aid} value={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.aid:''} />
      </Col>
      </Row>
    ),
    trojan: (<Row gutter={[16,24]}>
      <Col xs={24} sm={24} md={12}> {commonContent.select} </Col>
      <Col xs={20} sm={20} md={10}> {commonContent.remark} </Col>
      <Col xs={4} sm={4} md={2}> {commonContent.deleteIcon} </Col>
      <Col xs={24} sm={24} md={12}> {commonContent.serverAddress} </Col>
      <Col xs={24} sm={24} md={12}>
        <Input.Password placeholder="密碼 (Password)" onChange={editOnChange.aid} value={urlList[urlPointer] && urlList[urlPointer].hasOwnProperty('json')? urlList[urlPointer].json.aid:''} />
      </Col>
      </Row>
    )

  }

  const operateTabContent = {
    fastEdit: (
    <Row gutter={[16,24]} justify={"center"}>
      <Col xs={16} sm={16} md={14} style={{height: 48}}> {commonContent.select} </Col>
      <Col xs={4} sm={4} md={2}> {commonContent.deleteIcon} </Col>
      <Col xs={24} sm={24} md={16}> {commonContent.remark} </Col>
      <Col xs={24} sm={24} md={16}> {commonContent.serverAddress} </Col>
    </Row>),
    detailedEdit: ( urlList[urlPointer]? (supportedType.includes(urlList[urlPointer].type)? detailedContent[urlList[urlPointer].type]:<Skeleton/>):(<Skeleton/>)),
    buttons : ( <div><Badge count={hasEdited} dot><Button type="primary" icon={<CheckOutlined />} disabled={isLoading || !base64Input.length} onClick={saveOnClick}>生成</Button></Badge></div>)
  }

  return (
    <div className="App">
      <Layout>
        <Row justify="start" align={"middle"} style={{textAlign: "left"}}>
          <h2>Shawdowrockets 訂閱鏈接編輯器</h2>
          <Col xs={0} sm={0} md={8} style={{marginLeft: 8}}><h3>支持 {supportedType.map( (x,index) => index < supportedType.length-1? x+', ':x)} 鏈接編輯</h3></Col>
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
          Created by {<a href="https://www.phlinhng.com">phlinhng</a>}. All rights reserved.
        </Col>
        </Row>
        </Footer>
      </Layout>
    </div>
  );
}

export default App;
