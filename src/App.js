import React, { useState, useEffect } from 'react';
import { Button, Input, Menu, Radio, Select, Switch, Dropdown } from 'antd';
import { Layout, Row, Col, Card } from 'antd';
import { Badge, Modal, message, Skeleton } from 'antd';
import { CheckOutlined, DeleteOutlined, InfoOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons';
import { ExclamationCircleOutlined, QuestionCircleTwoTone, ShareAltOutlined } from '@ant-design/icons';
import shortid from 'shortid';
import useClippy from 'use-clippy';
import axios from 'axios';
import crypto from 'crypto';
import QRCode from 'qrcode.react';
import './App.css';
import { Logo } from './img';
import { apiBaseURL } from './submit';
import 'github-fork-ribbon-css/gh-fork-ribbon.css';

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
  ss: (num) => ({ id: "加密方式 (Method)", aid: "", add: "", port: "", ps: "new shadowsocks [%]".replace('%',num) }),
  vmess: (num) => ({ add: "", port:"", id:"", aid: 0, net: "", host: "", path:"/", tls: "none", type: "none", ps: "new v2ray [%]".replace('%',num), v: 2 }),
  trojan: (num) => ({ aid: "", add: "", port: "", ps: "new trojan [%]".replace('%',num) })
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

const textTool = {
  text2json: ({
    vmess: ( (text) => {
      const vmess_json = JSON.parse(Base64.decode(text.replace('vmess://','')));
      return { type: urlType(text), json: vmess_json, raw: text, id: shortid.generate() };
    }),
    ss: ( (text) => {
      const remarkStartIndex = text.search('#');
      const ss_name = decodeURIComponent(text.slice(remarkStartIndex+1));
      const ss_link = text.slice(5,remarkStartIndex).split(/[@:]+/); // userinfo@mydomain.com:8888
      const ss_info = Base64.decode(ss_link[0]).split(':'); // userinfo = websafe-base64-encode-utf8(method  ":" password)
      const ss_json = { id: ss_info[0], aid: ss_info[1], add: ss_link[1], port: ss_link[2], ps: ss_name };
      return { type: urlType(text), json: ss_json, raw: text, id: shortid.generate()}; //id: security method, aid: password
    }),
    trojan: ( (text) =>{
      const argStartIndex = text.search('\\?');
      const remarkStartIndex = text.search('#');
      const trojan_name = decodeURIComponent(text.slice(remarkStartIndex+1)); // trojan://[password]@[address]:[port]?peer=[host]#[remark]
      const trojan_link = text.slice(9,argStartIndex).split(/[@:]+/);
      const trojan_peer = text.slice(argStartIndex+1,remarkStartIndex).replace('peer=','');
      const trojan_json = { aid: trojan_link[0], add: trojan_link[1], port: trojan_link[2], host: trojan_peer, ps: trojan_name };
      return {type: urlType(text), json: trojan_json, raw: text, id: shortid.generate()};
    }),
    unsupported: ( (text) => {
      return { type: urlType(text), json:{}, raw: text, id: shortid.generate() };
    }),
    isText: ( (text) => ( text.split(/[,;\n]+/).every( x => validPrefix.test(x) ) ))
  }),
  json2text: ({
    vmess: ( (json) => ( 'vmess://' + Base64.encode(JSON.stringify(json)) ) ),
    ss: ( (json) => {
      // chacha20-ietf:password@mydomain.com:8888
      // id: method, aid: password
      // sip002:
      // SS-URI = "ss://" userinfo "@" hostname ":" port [ "/" ] [ "?" plugin ] [ "#" tag ]
      // userinfo = websafe-base64-encode-utf8(method  ":" password)
      const ss_info = json.id + ':' + json.aid;
      return 'ss://' + Base64.encode(ss_info) + '@' + json.add + ':' + json.port + '#' + encodeURIComponent(json.ps);
    }),
    trojan: ( (json) => {
      // trojan://[password]@[address]:[port]?peer=#[remark]
      return 'trojan://' + json.aid + '@' + json.add + ':' + json.port + '?peer='+ (json.host? json.host:json.add) + '#' + encodeURIComponent(json.ps);
    }),
    unsupported: ( (json) => json.raw )
  }),
  text2qrcode: ( (text) => <QRCode size="96" value={text}></QRCode>)
}

const urlArray = {
  b64ToArr: ((cipher) => {
    if(cipher.length && base64regex.test(cipher)){
      const text_list = Base64.decode(cipher).split(/[,;\n]+/); //base64 cipher to text to array of texts
      const json_arr = text_list.map(x => textTool.text2json[urlType(x)](x)); // array of texts to array of jsons
      //console.log('urlArray.b64ToArr',json_arr);
      return json_arr; //array of jsons
    }else {
      return cipher; //if input is not a base64 cipher, return the original input
    }
  }),
  arrToB64: ((arr) => ( Base64.encode( arr.map( x=> textTool.json2text[x.type](x.json) ).join('\n') ) ))
}

const submitCustomForm = async (user, pwd, base64text) => {
  try {
    // check if user and password matched
    const objId = await axios({
      method: 'post',
      baseURL: apiBaseURL,
      url: '/check',
      'Content-Type': 'application/json',
      data: {"user": user , "pwd": crypto.createHash('sha256').update(pwd).digest('base64')}
    }).then(x => x.data);
    if(objId.length){
      // if matched, update records
      return axios({
        method: 'put',
        baseURL: apiBaseURL,
        url: objId[0]._id,
        data: {"encrypted": base64text}
      })
    }else {
      // if not matched, create  a new record
      return axios({
        method: 'post',
        baseURL: apiBaseURL,
        'Content-Type': 'application/json',
        data: {"user": user, "pwd": crypto.createHash('sha256').update(pwd).digest('base64')
        , "encrypted": base64text}
      })
    }
  }catch(err) {
    console.error(err);
  }

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

  const [ createdNo, setCreatedNo ] = useState({ss: 0, vmess: 0, trojan: 0});

  const [ qrcodeVisible, setQrcodeVisible ] = useState(false);

  const [ subLinkVisible, setSubLinkVisible ] = useState(false);
  const [ customLink, setCustomLink ] = useState('');
  const [ customFormVisible, setCustomFormVisble ] = useState(false);
  const [ customFormLoading, setCustomFormLoading ] = useState(false);

  const [ customLinkUser, setCustomLinkUser ] = useState('');
  const [ customLinkPwd, setCustomLinkPwd ] = useState('');

  useEffect ( () => {
    if(window.location.search){
      const searchParams = new URLSearchParams(window.location.search);
      if(searchParams.get('sub') !== null){
        inputOnChange.subscribe({target:{value: searchParams.get('sub') }})
        .then( x => {if(x && searchParams.get('qrcode') === 'yes') setQrcodeVisible(true);} )
        .catch( err => console.error(err) );
      }
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

  const getSubscription = async (subs) => {
    let subArr = subs.split(/[,;\n]+/);
    let resultArr = [];
    for(let sub of subArr){
      await axios.get(sub)
      .then(res => {
        resultArr.push(Base64.decode(res.data));
      }).catch(console.error);
    }
    return resultArr.join('\n');
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
      if(base64regex.test(text_b64)) {
        try{
          getServerList(text_b64);
          const params = new URLSearchParams(window.location.search);
          params.set('sub',Base64.decode(text_b64));
          window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
        }catch(err){
          console.error(err);
        }
      }
      // if equals, mean that input text have not been transferred to urls array
      //console.log(text_b64);
    },
    subscribe: async (e) => {
      const content = e.target.value;
      if(content === null) { return; }

      setSubscribeInput(content);
      if(textTool.text2json.isText(content)) {
        setTextInput(content);
        if(e.target.value === '') { return; }
        const text_b64 = Base64.encode(content);
        setBase64Input(text_b64);
        if(base64regex.test(text_b64)) {
          try{
            setTextInput(Base64.decode(text_b64));
            getServerList(text_b64);
            setInputActive('TEXT');
          }catch(err){
            console.error(err);
          }
        }
        // if equals, mean that input text have not been transferred to urls array
        console.log(text_b64);
      }else if(/^(http|https).*/.test(content)){
        const key = 'fetching';
        const params = new URLSearchParams(window.location.search);
        params.set('sub',content);
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
        message.loading({ content: '導入訂閱鏈接中', key });
        return await getSubscription(content)
        .then(x => {setTextInput(x); return Base64.encode(x);})
        .then(x => {setBase64Input(x); return getServerList(x);})
        .then(x => {message.success({ content: ['導入',x.length,'個節點','成功'].join(' '), key, duration: 2 });})
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


  const performSave = () => {
    const Base64Output = urlArray.arrToB64(serverList);
    const TextOutput = serverList.map(x => textTool.json2text[x.type](x.json) ).join('\n');
    setBase64Input(Base64Output);
    setTextInput(TextOutput);
    message.success('保存成功');
    console.log(serverList);
    setHasEdited(0);
  }

  const customLinkForm = {
    userOnChange: ( e => setCustomLinkUser(e.target.value.trim()) ),
    pwdOnChange: ( e => setCustomLinkPwd(e.target.value)),
    submit: ( async () => {
      try{
        const params = new URLSearchParams(window.location.search);
        setCustomFormLoading(true);
        submitCustomForm(customLinkUser, customLinkPwd, base64Input)
        .then( x => { return x.data._id } )
        .then( x => { return apiBaseURL+'/'+x })
        .then( x => {
          setCustomLink(x);
          params.set('sub',x);
          window.history.replaceState({}, '', `${window.location.pathname}?${params}`) })
        .then( () => {
          message.success('訂閱鏈接己生成');
          setCustomFormLoading(false);
          setSubLinkVisible(true);
          setCustomFormVisble(false); })
        .catch( (err) => {
          console.error(err);
          setCustomFormLoading(false);
        } )
      }catch(err) {
        console.error(err);
        setCustomFormLoading(false);
        message.error('Internal Error');
      }
    })
  }

  const subLinkCreationConfirm = () => {
    confirm({title: '確定生成訂閱鏈結？',
    icon: <ShareAltOutlined />,
    content: 'This operation will use an API provided by the author, and your data will be confidential. Your links will not be sent by API before confirming . If you have security concern please make your own decision before clicking OK.',
    onOk() {
      setCustomFormVisble(true);
      return;
    },
    onCancel(){
      return;
    }})
  }

  const subLinkModal = {
    btnOnClick: (() => {
      if(hasEdited){
        confirm({
          title: '有未保存的修改' ,
          icon: <InfoOutlined />,
          content: '按保存生成訂閱鏈接',
          okText: '保存',
          cancelText: '取消',
          okType: 'danger',
          onOk: () =>  {
            setBase64Input( urlArray.arrToB64(serverList) );
            setTextInput( serverList.map(x => textTool.json2text[x.type](x.json) ).join('\n') );
            setHasEdited(0);
            message.success('保存成功');
            subLinkCreationConfirm();},
          onCancel: () => { return; }}
        );
      }else {
        subLinkCreationConfirm();
      }
      return;
    }),
  }

  const qrcodeModal = {
    btnOnClick: ( () => {
      const params = new URLSearchParams(window.location.search);
      if(hasEdited){
        confirm({
          title: '有未保存的修改' ,
          icon: <InfoOutlined />,
          content: '按保存生成二維碼',
          okText: '保存',
          cancelText: '取消',
          okType: 'danger',
          onOk() {
            setBase64Input( (urlArray.arrToB64(serverList)) );
            setTextInput(serverList.map(x => textTool.json2text[x.type](x.json) ).join('\n') );
            message.success('二維碼己生成');
            setHasEdited(0);
            setQrcodeVisible(true);

            params.set('qrcode','yes');
            window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
          },
          onCancel() {
            setQrcodeVisible(false);
            params.delete('qrcode');
            window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
          },});
        }else{
        setQrcodeVisible(true);
        params.set('qrcode','yes');
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
      }
      return;
    }),
    close: ( () => {
      setQrcodeVisible(false);
      const params = new URLSearchParams(window.location.search);
      params.delete('qrcode');
      window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    } ),
  }

  //const redoOnClick = () => {
    //const orignalName = urlName(serverList[serverPointer].raw);
    //const selectedId = serverList[serverPointer].id;
    //setServerList(serverList.map(item => item.id === selectedId ? {...item, name: orignalName }: item));
  //}

  const deleteOnClick = () => {
    confirm({
      title: '確定要刪除' + serverList[serverPointer].json.ps + '?' ,
      icon: <ExclamationCircleOutlined />,
      content: '這項操作無法復原',
      okText: '確定',
      cancelText: '取消',
      okType: 'danger',
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
    let new_pointer = 0;
    // move pointer first
    if(serverList.filter(item => item.id !== obj.id).length){
      new_pointer = (serverPointer+1)%serverList.filter(item => item.id !== obj.id).length;
    }
    setServerPointer(new_pointer);
    //delete
    try{
      const new_base64 = urlArray.arrToB64(serverList.filter(item => item.id !== obj.id));
      const new_urls = urlArray.b64ToArr(new_base64);
      setBase64Input(new_base64);
      setTextInput(Base64.decode(new_base64));
      setServerList(new_urls);
      message.success('刪除 ' + obj.json.ps + ' 成功');
    } catch (err) {
      console.error(err);
    }
    
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
        if(new_net === 'kcp'){
          setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net, host: "", path: "", type: textTool.text2json.vmess(serverList[serverPointer].raw).json.type} }: item));
          setHasEdited(1);
        }else if(new_net === 'ws'){
          setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net, host: textTool.text2json.vmess(serverList[serverPointer].raw).json.host, path: textTool.text2json.vmess(serverList[serverPointer].raw).json.path} }: item));
          setHasEdited(1);
        }else{
          setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, net: new_net, host: "", path: ""} }: item));
          setHasEdited(1);
        }
      }
    }),
    address : ((e) => {
      const selectedId = serverList[serverPointer].id;
      if(serverList[serverPointer].type === 'vmess' && !serverList[serverPointer].json.net) {
        setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, add: e.target.value, host: e.target.value} }: item));
      }else{
        setServerList(serverList.map(item => item.id === selectedId ? {...item, json: {...item.json, add: e.target.value} }: item));
      }
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
        if(serverList[serverPointer].json.net === 'ws' || serverList[serverPointer].type === 'trojan'){
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
      //console.log(e,e.key);
      const typeKey = e.key;
      const new_createdNo = createdNo[typeKey] + 1;
      const new_createdNoJson = JSON.parse(JSON.stringify(createdNo));
      new_createdNoJson[typeKey] = new_createdNo;
      setCreatedNo(new_createdNoJson);

      const new_json = defaultJson[typeKey](new_createdNo);
      const new_raw = textTool.json2text[typeKey](new_json);

      const new_server = { type: typeKey, json: new_json, raw: new_raw, id: shortid.generate() };
      setServerList([...serverList, new_server]); //correct way to push new item to array in state
      setServerPointer(serverList.length? serverList.length:0);
      setLoading(false);
      const new_text = (textInput.length? (textInput+';'):'') + new_raw;
      inputOnChange.base64({target:{value: Base64.encode(new_text)}}); // to prevent success message poping up , set base64 instead of text
      setOperateActive('detailedEdit');
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
      <Col span={24}><Button type="primary" block onClick={importFromClipboard.base64}>從剪貼版導入</Button></Col></Row>),
    _buttons: (
    <Badge count={hasEdited} offset={[-3,0]} dot>
      <Button type="primary" disabled={!serverList.length || !base64Input.length} onClick={subLinkModal.btnOnClick}>訂閱鏈接</Button>
    </Badge>)
  }

  const commonContent = {
    select: (<div style={{display: "flex", justifyContent: "space-between"}}>
    <Select showSearch value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? [serverList[serverPointer].json.ps,serverList[serverPointer].id]:''} disabled={isLoading || !base64Input.length} style={{width: "76%"}} onChange={selectOnChange.item}
    filterOption={ (input,option) => option.children[2].toLowerCase().indexOf(input.toLowerCase()) >= 0  }>
    { serverList.filter(x => supportedType.includes(x.type)).map( (item) => (<Option key={item.id} value={[item.json.ps,item.id]}>{getLogo(item.type)} {item.json.ps}</Option>) ) }
    </Select>
    <Dropdown overlay={<Menu onClick={editOnChange.create}>
      {supportedType.map( x => (<Menu.Item key={x}>{getLogo(x)}&nbsp;&nbsp;{x.toUpperCase()}</Menu.Item>) )}
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
        <Input style={{width: "75%", textAlign:"left"}} placeholder="UUID" onChange={editOnChange.uuid} value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.id:''} />
        <Input style={{width: "25%"}} placeholder="AID" onChange={editOnChange.aid} value={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.aid:''} />
        </InputGroup>
      </Col>
      <Col xs={24} sm={24} md={12}>
        <Radio.Group style={{marginLeft: -24}} onChange={editOnChange.net} disabled={isLoading || !base64Input.length} value={serverList[serverPointer]? (serverList[serverPointer].json? serverList[serverPointer].json.net:''):''}>
          <Radio key="tcp" value="">TCP</Radio>
          <Radio key="ws" value="ws">WS</Radio>
          <Radio key="kcp" value="kcp">KCP</Radio>
        </Radio.Group>
        <Switch checkedChildren="TLS" unCheckedChildren="TLS" disabled={isLoading || !base64Input.length} onChange={editOnChange.tls}
        checked={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.tls === 'tls'):false}></Switch>
      </Col>
      <Col xs={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.net === 'ws'? 24:0):0}
      sm={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.net === 'ws'? 24:0):0}
      md={serverList[serverPointer] && serverList[serverPointer].hasOwnProperty('json')? (serverList[serverPointer].json.net === 'ws'? 12:0):0}>
      <InputGroup compact>
      <Input style={{width: "75%", textAlign:"left"}} placeholder="域名 (Host)" onChange={editOnChange.ws.host} value={serverList[serverPointer]? (serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.host:''):''} />
      <Input style={{width: "25%", textAlign:"left"}} placeholder="path" onChange={editOnChange.ws.path} value={serverList[serverPointer]? (serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.path:''):''} />
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
      <Col xs={24} sm={24} md={12}>
        <InputGroup compact>
        <Input style={{width: "100%", textAlign:"left"}} placeholder="域名 (Server Name)" onChange={editOnChange.ws.host} value={serverList[serverPointer]? (serverList[serverPointer].hasOwnProperty('json')? serverList[serverPointer].json.host:''):''} />
        </InputGroup>
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
    _buttons : (<span>
      <Badge count={hasEdited} offset={[-7,0]} dot>
        <Button style={{marginRight: 8}} type="primary" icon={<QrcodeOutlined />} disabled={isLoading || !base64Input.length} onClick={qrcodeModal.btnOnClick}></Button>
      </Badge>
      <Badge count={hasEdited} offset={[-3,0]} dot>
        <Button type="primary" icon={<CheckOutlined />} disabled={isLoading || !base64Input.length} onClick={performSave}>保存</Button>
      </Badge>
      </span>)
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
          <Card className="card" tabList={operateTabList} tabBarExtraContent={operateTabContent._buttons} activeTabKey={operateActive} onTabChange={key => setOperateActive(key)}>{operateTabContent[operateActive]}</Card>
          </Col>
          <Col xs={24} sm={24} md={12}>
            <Card className="card" tabList={inputTabList} tabBarExtraContent={inputTabContent._buttons} activeTabKey={inputActive} onTabChange={key => setInputActive(key)}>{inputTabContent[inputActive]}</Card>
          </Col>
        </Row>
        </Content>
        <Modal title="生成二維碼 (Generate QRCode)" visible={qrcodeVisible} onOk={qrcodeModal.close} onCancel={qrcodeModal.close}>
          <Row justify="center">
          {textTool.text2qrcode(textInput)}
          </Row>
        </Modal>
        <Modal title="訂閱鏈接 (Generate Subscription link)" visible={subLinkVisible} onOk={() => setSubLinkVisible(false)} onCancel={() => setSubLinkVisible(false)}>
          <Row gutter={[16,16]} justify="center">
            <Col span={20}><Input value={customLink}/></Col>
          </Row>
          <Row justify="center">
            {textTool.text2qrcode( "sub://" + Base64.encode(customLink) )}
          </Row>
        </Modal>
        <Modal title="請輸入資料 (用於更新訂閱鏈接)" visible={customFormVisible} onOk={customLinkForm.submit} onCancel={() => setCustomFormVisble(false)} confirmLoading={customFormLoading}>
          <Row gutter={[16,16]} justify="center">
            <Col xs={20} sm={20} md={12}><Input placeholder="使用者名稱 (唯一識別符)" value={customLinkUser} onChange={customLinkForm.userOnChange}/></Col>
            <Col xs={20} sm={20} md={12}><Input.Password placeholder="密碼 (Password)" value={customLinkPwd} onChange={customLinkForm.pwdOnChange}/></Col>
          </Row>
        </Modal>
        <Footer>
        <Row justify={"center"}>
        <Col span={24}>
          Created by {<a href="https://www.phlinhng.com">phlinhng</a>}. All rights reserved.
        </Col>
        <Col xs={0} sm={0} md={qrcodeVisible || subLinkVisible || customFormVisible? 0:24}>
        <a className="github-fork-ribbon right-bottom fixed" href="https://github.com/phlinhng/b64-url-editor" data-ribbon="Fork me on GitHub" title="Fork me on GitHub">Fork me on GitHub</a>
        </Col>
        </Row>
        </Footer>
      </Layout>
    </div>
  );
}

export default App;
