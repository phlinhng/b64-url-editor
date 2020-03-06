import React, { useState, useEffect } from 'react';
import { Button, Input, Menu, Radio, Select, Switch, Dropdown } from 'antd';
import { Layout, Row, Col, Card } from 'antd';
import { Badge, Modal, message, Skeleton } from 'antd';
import { CheckOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { ExclamationCircleOutlined, QuestionCircleTwoTone } from '@ant-design/icons';
import shortid from 'shortid';
import useClippy from 'use-clippy';
import axios from 'axios';
import './App.css';
import { Logo } from './img';

const { TextArea } = Input;
const { Option } = Select;
const { Content, Footer } = Layout;
const { confirm } = Modal;
const InputGroup = Input.Group;

const supportedType = ['ss','vmess','trojan'];
const validPrefix = /^(vmess|ss|trojan).*/;

const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

const inputTabList = [{key: 'API', tab: 'API'}, {key: 'TEXT', tab: 'URL'}, {key: 'BASE64', tab: 'BASE64'} ];

const operateTabList = [{key: 'fastEdit', tab: '快速操作'}, {key: 'detailedEdit', tab: '詳細編輯'}];

const ssMethod = ['none','table','rc4','rc4-md5','rc4-md5-6','salsa20','chacha20','chacha20-ietf',
'aes-256-cfb','aes-192-cfb','aes-128-cfb','aes-256-cfb1','aes-192-cfb1','aes-128-cfb1','aes-256-cfb8','aes-192-cfb8','aes-128-cfb8',
'aes-256-ctr','aes-192-ctr','aes-128-ctr','bf-cfb','camellia-256-cfb','camellia-192-cfb','camellia-128-cfb',
'cast5-cfb','des-cfb','idea-cfb','seed-cfb','aes-256-gcm','aes-192-gcm','aes-128-gcm',
'chacha20-ietf-poly1305','chacha20-poly1305','xchacha20-ietf-poly1305'];

const defaultJson = {
  ss: { id: "", aid: "", add: "", port: "", ps: "new shadowsocks" },
  vmess: { add: "", port:"", id:"", aid: 1, net: "tcp", host: "", path:"/", tls: "none", type: "none", ps: "new v2ray", v: 2 },
  trjan: { aid: "", add: "", port: "", ps: "new trojan" }
}

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
    const trojan_json = { aid: trojan_link[0], add: trojan_link[1], port: trojan_link[2], ps: trojan_name };
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

const urlArray = {
  b64ToArr: ((cipher) => {
    if(cipher.length && base64regex.test(cipher)){
      const text_list = Base64.decode(cipher).split(/[;\n]+/); //base64 cipher to text to array of texts
      const json_arr = text_list.map(x => text2json[urlType(x)](x)); // array of texts to array of jsons
      console.log('urlArray.b64ToArr',json_arr);
      return json_arr; //array of jsons
    }else {
      return cipher; //if input is not a base64 cipher, return the original input
    }
  }),
  arrToB64: ((arr) => ( Base64.encode( arr.map( x=> json2text[x.type](x.json) ).join('\n') ) ))
}

function App() {
  const [ inputActive, setInputActive ] = useState('API');
  const [ operateActive, setOperateActive ] = useState('fastEdit');

  const [ base64Input, setBase64Input ] = useState('');
  const [ textInput, setTextInput ] = useState('');
  const [ subscribeInput, setSubscribeInput ] = useState('');

  const [ serverList, setServerList ] = useState([]);
  const [ serverPointer, setServerPointer ] = useState(0); // index of selected item

  const [ clipboard, setClipboard ] = useClippy();

  const [ isLoading, setLoading ] = useState(true);
  const [ hasEdited, setHasEdited ] = useState(0);

  useEffect ( () => {
    if(window.location.search){
      const searchParams = new URLSearchParams(window.location.search)
      inputOnChange.subscribe({target:{value: searchParams.get('sub') }});
    }
  },[]); // this empty array is a trick to make useEffect to run only once when the page mounted

  const getServerList = (text_b64) => {
    try{
      if(base64regex.test(text_b64)) {
        //function urlArray.b64ToArr will turn base64 format urls and create a serverList array
        //urlArray.b64ToArr(text_b64) is an array from original base64
        //urls is an array urlArray.b64ToArr(text_b64) skipping empty liines
        const urls = urlArray.b64ToArr(text_b64).filter(x => x.raw !== "");
        if (urls.length <  urlArray.b64ToArr(text_b64).length){
          setBase64Input(urlArray.arrToB64(urls)); // update base64 input field if any empty line was skipped
          setTextInput(Base64.decode(urlArray.arrToB64(urls)));
        }
        if (urls.filter(x => supportedType.includes(x.type)).length > 0){
          setServerList(urls);
          //console.log('getServerList',urls);
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

  

  const inputOnChange = {
    base64: (e) => {
      setBase64Input(e.target.value);
      if(base64regex.test(e.target.value)) {
        try{
          setTextInput(Base64.decode(e.target.value));
          getServerList(e.target.value);
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
      if(getServerList(text_b64) !== text_b64) { message.success('解析成功'); }
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
        if(getServerList(text_b64) !== text_b64) { message.success('解析成功'); }
      }else if(/^(http|https).*/.test(content)){
        const key = 'fetching';
        message.loading({ content: '導入訂閱鏈接中', key });
        axios.get(e.target.value)
        .then(res => {return res.data;})
        .then(x => {setBase64Input(x); return Base64.decode(x);})
        .then(x => {setTextInput(x); return Base64.encode(x);})
        .then(x => {return getServerList(x);})
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
      setServerPointer(serverList.findIndex(x => x.id === val[1]));
    })
  }

  const saveOnClick = () => {
    const output = urlArray.arrToB64(serverList);
    setBase64Input(output);
    setTextInput(serverList.map(x => json2text[x.type](x.json) ).join('\n') );
    setClipboard(output);
    message.success('New BASE64 copied');
    setHasEdited(0);
  }

  const redoOnClick = () => {
    //const orignalName = urlName(serverList[serverPointer].raw);
    //const selectedId = serverList[serverPointer].id;
    //setServerList(serverList.map(item => item.id === selectedId ? {...item, name: orignalName }: item));
  }

  const deleteOnClick = () => {
    confirm({
      title: '確定要刪除' + serverList[serverPointer].json.ps + '?' ,
      icon: <ExclamationCircleOutlined />,
      content: '這項操作無法復原',
      okText: '確定',
      cancelText: '取消',
      onOk() {
        //console.log(serverPointer);
        performDelete(serverList[serverPointer]);
        //console.log('OK');
      },
      onCancel() {
        //console.log('Cancel');
        console.log(serverList);
      },
    });
  }

  const performDelete = (obj) => {
    // move pointer first
    if(serverList.filter(item => item.id !== obj.id).length){
      setServerPointer( (serverPointer+1)%serverList.length );
    }else {
      setServerPointer(0);
    }
    //delete
    setServerList(serverList.filter(item => item.id !== obj.id));
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
      const selectedId = serverList[serverPointer].id;
      // Mapping the old array into a new one, swapping what you want to change for an updated item along the way.
      setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, ps: e.target.value } }: item));
      setHasEdited(1);
    }),
    net: ( (e) => {
      const new_net = e.target.value;
      if(serverList[serverPointer].json){
        const selectedId = serverList[serverPointer].id;
        if(new_net !== 'kcp'){
          setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net, type: "none"} }: item));
          setHasEdited(1);
        }else if(new_net !== 'ws'){
          setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net, host: "", path: ""} }: item));
          setHasEdited(1);
        }else{
          setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net} }: item));
          setHasEdited(1);
        }
      }
    }),
    address : ((e) => {
      const selectedId = serverList[serverPointer].id;
      setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, add: e.target.value} }: item));
      setHasEdited(1);
    }),
    port: ((e) => {
      const selectedId = serverList[serverPointer].id;
      setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, port: e.target.value} }: item));
      setHasEdited(1);
    }),
    uuid: ((e) => {
      const selectedId = serverList[serverPointer].id;
      setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, id: e.target.value} }: item));
      setHasEdited(1);
    }),
    aid: ((e) => {
      const selectedId = serverList[serverPointer].id;
      setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, aid: e.target.value} }: item));
      setHasEdited(1);
    }),
    tls: ((checked, e) => {
      //console.log(e);
      const selectedId = serverList[serverPointer].id;
      setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, tls: checked? 'tls':'none' } }: item));
      setHasEdited(1);
    }),
    ws: {
      host: ((e) => {
        const selectedId = serverList[serverPointer].id;
        if(serverList[serverPointer].json.net === 'ws'){
          setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, host: e.target.value} }: item));
          setHasEdited(1);
        }else {
          return;
        }
      }),
      path: ((e) => {
        const selectedId = serverList[serverPointer].id;
        if(serverList[serverPointer].json.net === 'ws'){
          setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, path: e.target.value} }: item));
          setHasEdited(1);
        }else{
          return;
        }
      })
    },
    type: ((val) => {
      const selectedId = serverList[serverPointer].id;
      if(serverList[serverPointer].json.net === 'kcp'){
        setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, type: val} }: item));
        setHasEdited(1);
      }
    }),
    ssMethod: ( (val) => {
      const selectedId = serverList[serverPointer].id;
      if(serverList[serverPointer].type === 'ss'){
        setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, id: val} }: item));
        setHasEdited(1);
      }
    }),
    create: ( (e) => {
      console.log(e,e.key);
      const new_json = { type: e.key, json: defaultJson[e.key], raw: "", id: shortid.generate() };
      setServerList([...serverList, new_json]); //correct way to push new item to array in state
      setServerPointer(serverList.length? serverList.length+1:0);
      setLoading(false);
      setHasEdited(1);
    })
  }

  const inputTabContent = {
    API: (<Row gutter={[0,16]} style={{marginBottom: -20}}>
      <Col span={24}><TextArea rows={4} autosize={false} placeholder={'輸入訂閱網址或服務器鏈接'} onChange={inputOnChange.subscribe} value={subscribeInput}/></Col>
      <Col span={24} ><Button type="primary" block onClick={importFromClipboard.subscribe}>從剪貼版導入</Button></Col></Row>),
    TEXT: (<Row gutter={[0,16]} style={{marginBottom: -20}}>
      <Col span={24}><TextArea rows={4} autosize={false} onChange={inputOnChange.text} value={textInput}/></Col>
      <Col span={24}><Button type="primary" block onClick={importFromClipboard.text}>從剪貼版導入</Button></Col></Row>),
    BASE64: (<Row gutter={[0,16]} style={{marginBottom: -20}}>
      <Col span={24}><TextArea rows={4} autosize={false} onChange={inputOnChange.base64} value={base64Input}/></Col>
      <Col span={24}><Button type="primary" block onClick={importFromClipboard.base64}>從剪貼版導入</Button></Col></Row>)
  }

  const commonContent = {
    select: (<div style={{display: "flex", justifyContent: "space-between"}}>
    <Select showSearch value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? [serverList[serverPointer].json.ps,serverList[serverPointer].id]:''} disabled={isLoading || !base64Input.length} style={{width: "76%"}} onChange={selectOnChange.item}
    filterOption={ (input,option) => option.children[2].toLowerCase().indexOf(input.toLowerCase()) >= 0  }>
    { serverList.filter(x => supportedType.includes(x.type)).map( (item) => (<Option key={item.id} value={[item.json.ps,item.id]}>{getLogo(item.type)} {item.json.ps}</Option>) ) }
    </Select>
    <Dropdown overlay={<Menu onClick={editOnChange.create}>
      {supportedType.map( x => (<Menu.Item key={x}>{x}</Menu.Item>) )}
    </Menu>}><Button type="primary" icon={<PlusOutlined />}/></Dropdown>
    <Button type="primary" disabled={isLoading ||!base64Input.length} icon={<DeleteOutlined />} onClick={deleteOnClick} danger/>
    </div>),
    remark: (<Input placeholder="節點名稱 (Remark)" addonAfter={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('type')? ( getLogo(serverList[serverPointer].type) ):(<QuestionCircleTwoTone />)}
    value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.ps:''} disabled={isLoading || !base64Input.length} onChange={editOnChange.ps} onPressEnter={editOnChange.ps}/>),
    serverAddress: (<InputGroup compact>
    <Input style={{width: "75%", textAlign:"left"}} disabled={isLoading || !base64Input.length} placeholder="服務器地址 (Address)" onChange={editOnChange.address} value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.add:''} />
    <Input style={{width: "25%"}} disabled={isLoading || !base64Input.length} placeholder="port" onChange={editOnChange.port} value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.port:''} />
    </InputGroup>),
    skeleton: ( <Row type="flex" style={{marginBottom: -12}}><Skeleton /></Row> ),
  }

  const detailedContent = {
    vmess: (<Row gutter={[16,24]} type="flex" style={{marginBottom: -18}}>
      <Col xs={24} sm={12} md={12} > {commonContent.select} </Col>
      <Col xs={24} sm={12} md={12}> {commonContent.remark} </Col>
      <Col xs={24} sm={24} md={12}> {commonContent.serverAddress} </Col>
      <Col xs={24} sm={24} md={12}>
        <InputGroup compact>
        <Input style={{width: "75%"}} placeholder="UUID" onChange={editOnChange.uuid} value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.id:''} />
        <Input style={{width: "25%"}} placeholder="AID" onChange={editOnChange.aid} value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.aid:''} />
        </InputGroup>
      </Col>
      <Col xs={24} sm={24} md={12}>
        <Radio.Group style={{marginLeft: -24}} onChange={editOnChange.net} value={serverList[serverPointer]? (serverList[serverPointer].json? serverList[serverPointer].json.net:''):''}>
          <Radio key="tcp" value="tcp">TCP</Radio>
          <Radio key="ws" value="ws">WS</Radio>
          <Radio key="kcp" value="kcp">KCP</Radio>
        </Radio.Group>
        <Switch checkedChildren="TLS" unCheckedChildren="TLS" onChange={editOnChange.tls}
        checked={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.tls === 'tls'):false}></Switch>
      </Col>
      <Col xs={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.net === 'ws'? 24:0):0}
      sm={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.net === 'ws'? 24:0):0}
      md={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.net === 'ws'? 12:0):0}>
      <InputGroup compact>
      <Input style={{width: "75%"}} placeholder="域名 (Host)" onChange={editOnChange.ws.host} value={serverList[serverPointer]? (serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.host:''):''} />
      <Input style={{width: "25%"}} placeholder="path" onChange={editOnChange.ws.path} value={serverList[serverPointer]? (serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.path:''):''} />
      </InputGroup>
      </Col>
      <Col xs={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.net === 'kcp'? 24:0):0}
      sm={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.net === 'kcp'? 24:0):0}
      md={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.net === 'kcp'? 12:0):0}>
      <Select style={{width:"100%"}} onChange={editOnChange.type} value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.type:''}>
        <Option key='none' value='none'>none (不偽裝)</Option>
        <Option key='wechat-video' value='wechat-video'> wechat-video (偽裝微信視頻) </Option>
        <Option key='srtp' value='srtp'>srtp (偽裝視頻通話)</Option>
        <Option key='utp' value='utp'>utp (偽裝BitTorrent下載) </Option>
        <Option key='dtls' value='dtls'>dlts (偽裝DLTS 1.2封包)</Option>
        <Option key='wireguard' value='wireguard'>wireguard (偽裝Wireguard封包)</Option>
      </Select>
    </Col>
    </Row>),
    ss: (<Row gutter={[16,24]} type="flex" style={{marginBottom: -18}}>
      <Col xs={24} sm={12} md={12}> {commonContent.select} </Col>
      <Col xs={24} sm={12} md={12}> {commonContent.remark} </Col>
      <Col xs={24} sm={24} md={12}> {commonContent.serverAddress} </Col>
      <Col xs={24} sm={24} md={12}></Col>
      <Col xs={24} sm={24} md={12}>
        <Select showSearch style={{width: "100%"}} placeholder="加密方式 (Method)" onChange={editOnChange.ssMethod} value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.id:''}
        filterOption={ (input,option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0  }>
          { ssMethod.map( x => (<Option key={x}>{x}</Option>) )}
        </Select>
      </Col>
      <Col xs={24} sm={24} md={12}>
        <Input.Password placeholder="密碼 (Password)" onChange={editOnChange.aid} value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.aid:''} />
      </Col>
      </Row>
    ),
    trojan: (<Row gutter={[16,24]} type="flex" style={{marginBottom: -18}}>
      <Col xs={24} sm={12} md={12}> {commonContent.select} </Col>
      <Col xs={24} sm={12} md={12}> {commonContent.remark} </Col>
      <Col xs={24} sm={24} md={12}> {commonContent.serverAddress} </Col>
      <Col xs={24} sm={24} md={12}>
        <Input.Password placeholder="密碼 (Password)" onChange={editOnChange.aid} value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.aid:''} />
      </Col>
      </Row>
    )

  }

  const operateTabContent = {
    fastEdit: (
    <Row gutter={[16,24]} justify={"space-around"} type="flex" style={{marginBottom: -18}}>
      <Col xs={24} sm={12} md={16}> {commonContent.select} </Col>
      <Col xs={24} sm={12} md={16}> {commonContent.remark} </Col>
      <Col xs={24} sm={24} md={16}> {commonContent.serverAddress} </Col>
    </Row>),
    detailedEdit: ( serverList[serverPointer]? (supportedType.includes(serverList[serverPointer].type)? detailedContent[serverList[serverPointer].type]:commonContent.skeleton):(commonContent.skeleton)),
    buttons : ( <span><Badge count={hasEdited} dot><Button type="primary" icon={<CheckOutlined />} disabled={isLoading || !base64Input.length} onClick={saveOnClick}>生成</Button></Badge></span>)
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
        <Footer>
        <Row justify={"center"}>
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