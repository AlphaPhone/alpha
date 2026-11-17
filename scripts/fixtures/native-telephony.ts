// Synthetic native bridge shared by browser checks and the private UI review server.
// No SIM, Android provider, personal account or hardware operation occurs here.
export type TelephonyFixture = {
  /** Human review keeps only synthetic contacts and draft slots on this localhost origin. */
  preview?: boolean;
  /** Access already granted (the default); false starts every read at its Allow button. */
  granted?: boolean;
  /** `direct` lets the reviewed send run; `handoff` is a phone without the SMS role. */
  sendMode?: 'direct' | 'handoff';
  voicemail?: 'ready' | 'unconfigured' | 'unsupported';
  empty?: boolean;
  singleUnread?: boolean;
  smsNoticeThread?: string;
  controlledSms?: boolean;
  controlledMms?: boolean;
  smsRoleHeld?: boolean;
  mms?: boolean;
  /** Pad the address book with this many contacts sorted ahead of the fixture people (AC-20 lookup). */
  padContacts?: number;
};

export function installTelephonyFixture(options: TelephonyFixture = {}) {
    localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({kind: 'offline'}));
    const w = window as any;
    w.androidBridge = {};
    w.telephonyCalls = [];
    w.telephonyInputs = [];
    const messageListeners = new Map<string, {eventName: string; callback: (data: unknown) => void}>();
    const sendResults = new Map<string, unknown>();
    const smsDrafts = new Map<string, string>();
    let listenerSequence = 0;
    const callStateListeners: ((data: unknown) => void)[] = [];
    w.deviceCallState = {inCall: false, emergency: false, emergencyLive: false, watching: true};
    /** A call-state change, as Telephony reports it to AlphaDevice. */
    w.setDeviceCallState = (state: unknown) => { w.deviceCallState = state; for (const listener of callStateListeners) listener(state); };
    /* Telecom's live calls as AlphaOngoingCall reports them (TelecomCallService); none by default. */
    const ongoingListeners: ((data: unknown) => void)[] = [];
    w.ongoingCalls = [];
    w.ongoingCallInputs = [];
    w.setOngoingCalls = (calls: unknown) => { w.ongoingCalls = calls; for (const listener of ongoingListeners) listener({calls}); };
    w.smsProviderChanged = () => {
      for (const listener of messageListeners.values()) {
        if (listener.eventName === 'messagesChanged') listener.callback({});
      }
    };
    if (options.smsNoticeThread) w.smsNoticeTap = {threadId: options.smsNoticeThread, token: '1'};
    const granted = options.granted !== false, direct = options.sendMode !== 'handoff', smsRoleHeld = options.smsRoleHeld ?? direct;
    w.access = {callLog: granted, sms: granted, contacts: granted, phoneState: granted, sendSms: granted && direct};
    if (options.singleUnread) w.readThreads = ['thread:103'];
    const now = Date.now(), minute = 60_000, hour = 60 * minute, day = 24 * hour;
    const padding = Array.from({length: options.padContacts || 0}, (_, i) => ({id: String(1000 + i), name: `Aaron ${String(i).padStart(3, '0')}`, phones: [`+1555020${String(i).padStart(4, '0')}`], emails: []}));
    const people = options.empty ? [] : [...padding,
      {id: '11', name: 'Ada Okafor', phones: ['+15550100101'], emails: ['ada@example.invalid']},
      {id: '12', name: 'Bao Tran', phones: ['+15550100102', '+15550100112'], emails: []},
      {id: '13', name: 'Carmen Ruiz', phones: ['+15550100103'], emails: ['carmen@example.invalid']},
      {id: '14', name: 'Dev Patel', phones: ['+15550100104'], emails: []},
      {id: '15', name: 'Elif Demir', phones: ['+15550100105'], emails: []},
      {id: '16', name: 'Farid Haddad', phones: ['+15550100106'], emails: []},
      {id: '17', name: 'Grace Lindqvist', phones: ['+15550100107'], emails: ['grace@example.invalid']},
      {id: '18', name: 'Hana Sato', phones: ['+15550100108'], emails: []},
    ];
    w.people = people;
    const version = (id: string) => id.padStart(64, 'a').replace(/[^0-9a-f]/g, 'a');
    const previewContacts=new Map<string,any>();
    const contactKey='alpha.native-review.contacts.v1',draftKey='alpha.native-review.drafts.v1';
    const syncPreviewPeople=()=>{people.splice(0,people.length,...[...previewContacts.values()].map(p=>({id:p.id,name:p.displayName,phones:p.phoneNumbers.map((v:any)=>v.number),emails:p.emailAddresses.map((v:any)=>v.address)})));};
    const savePreviewContacts=()=>{localStorage.setItem(contactKey,JSON.stringify({schema:1,records:[...previewContacts.values()]}));syncPreviewPeople();};
    if(options.preview){
      const names:Record<string,[string,string]>={'11':['Ada','Okafor'],'12':['Bao','Tran'],'13':['Carmen','Ruiz'],'14':['Dev','Patel'],'15':['Elif','Demir'],'16':['Farid','Haddad']};
      for(const p of people){const parts=names[p.id];previewContacts.set(p.id,{id:p.id,lookup:`lookup-${p.id}`,displayName:p.name,...(parts?{givenName:parts[0],familyName:parts[1]}:{}),notes:'',starred:false,phoneNumbers:p.phones.map(number=>({number,type:'mobile'})),emailAddresses:p.emails.map(address=>({address,type:'home'})),version:version(p.id)});}
      try{const saved=JSON.parse(localStorage.getItem(contactKey)||'null');if(saved?.schema===1&&Array.isArray(saved.records)&&saved.records.every((p:any)=>typeof p?.id==='string'&&typeof p.displayName==='string'&&Array.isArray(p.phoneNumbers)&&Array.isArray(p.emailAddresses))){previewContacts.clear();for(const p of saved.records)previewContacts.set(p.id,p);syncPreviewPeople();}}catch{/* Preserve stored bytes; a malformed review fixture is never silently deleted. */}
      try{const saved=JSON.parse(localStorage.getItem(draftKey)||'[]');if(Array.isArray(saved))for(const row of saved)if(Array.isArray(row)&&typeof row[0]==='string'&&typeof row[1]==='string'&&(/^(sms-draft:v1:|assistant-draft:v1:)/).test(row[0]))smsDrafts.set(row[0],row[1]);}catch{/* Preserve stored review drafts. */}
    }
    const calls = options.empty ? [] : [
      {id: '1', number: '+15550100101', cachedName: 'Ada Okafor', date: now - 12 * minute, durationSeconds: 0, type: 'missed', isNew: true},
      {id: '2', number: '+15550100103', cachedName: 'Carmen Ruiz', date: now - 2 * hour, durationSeconds: 312, type: 'outgoing', isNew: false},
      {id: '3', number: '+15550100199', cachedName: null, date: now - 5 * hour, durationSeconds: 48, type: 'incoming', isNew: false},
      {id: '4', number: '+15550100102', cachedName: 'Bao Tran', date: now - day - hour, durationSeconds: 0, type: 'missed', isNew: false},
      {id: '5', number: '', cachedName: null, date: now - day - 3 * hour, durationSeconds: 0, type: 'rejected', isNew: false},
      {id: '6', number: '+15550100104', cachedName: 'Dev Patel', date: now - 2 * day, durationSeconds: 95, type: 'incoming', isNew: false},
      {id: '7', number: '+15550100107', cachedName: 'Grace Lindqvist', date: now - 3 * day, durationSeconds: 1260, type: 'outgoing', isNew: false},
      {id: '8', number: '+15550100105', cachedName: 'Elif Demir', date: now - 6 * day, durationSeconds: 20, type: 'incoming', isNew: false},
    ];
    w.voicemails = options.empty ? [] : [
      {id: '31', number: '+15550100101', cachedName: 'Ada Okafor', date: now - 10 * minute, durationSeconds: 24, isNew: true, hasAudio: true, carrierTranscript: 'Hi, it is Ada. The keys are with the neighbour at number four. Call me when you land.'},
      {id: '32', number: '+15550100199', cachedName: null, date: now - 26 * hour, durationSeconds: 41, isNew: true, hasAudio: true, carrierTranscript: null},
      {id: '33', number: '+15550100104', cachedName: 'Dev Patel', date: now - 4 * day, durationSeconds: 12, isNew: false, hasAudio: true, carrierTranscript: 'Dev here. Lunch on Thursday still works for me.'},
    ];
    const message = (id: number, threadId: string, incoming: boolean, ago: number, body: string, address: string) => ({
      id: `sms:${id}`, kind: 'sms', threadId, direction: incoming ? 'incoming' : 'outgoing', status: incoming ? 'read' : 'sent', date: now - ago, read: true,
      subscriptionId: 1, addresses: [address], body, deliveryReport: incoming ? null : 'none', attachments: 0,
    });
    w.messages = options.empty ? {} : {
      'thread:101': [
        message(1, 'thread:101', true, 3 * hour, 'Are we still on for dinner on Friday?', '+15550100101'),
        message(2, 'thread:101', false, 3 * hour - 4 * minute, 'Yes. Seven at the usual place?', '+15550100101'),
        message(3, 'thread:101', true, 2 * hour, 'Perfect. I will book the table.', '+15550100101'),
        message(4, 'thread:101', true, 9 * minute, 'Running ten minutes late, sorry. Can you order for me?', '+15550100101'),
      ],
      'thread:102': [
        message(5, 'thread:102', false, day, 'Did the parcel arrive?', '+15550100102'),
        message(6, 'thread:102', true, day - hour, 'It did. Thank you!', '+15550100102'),
      ],
      'thread:103': [message(7, 'thread:103', true, 2 * day, 'Your code is 000000. It expires in ten minutes.', '+15550100198')],
      'thread:104': [message(8, 'thread:104', true, 3 * day, 'Can you send me the address for Saturday?', '+15550100103'), message(9, 'thread:104', false, 3 * day - hour, 'Twelve Example Lane. See you there.', '+15550100103')],
      'thread:105': [message(10, 'thread:105', true, 5 * day, 'Happy birthday!', '+15550100107')],
    };
    if (!options.empty) Object.assign(w.messages['thread:101'][3], {read: false, status: 'received'});
    const threads = () => Object.entries(w.messages as Record<string, any[]>).map(([id, rows]) => {
      const last = rows[rows.length - 1];
      return {id, date: last.date, messageCount: rows.length, snippet: last.body, unread: id === 'thread:101' || id === 'thread:103' ? !w.readThreads?.includes(id) : false, addresses: last.addresses};
    }).sort((a, b) => b.date - a.date);
    const status = () => ({
      version: 2, voiceCapable: true, smsCapable: true,
      permissions: {contacts: w.access.contacts ? 'granted' : 'prompt', phoneState: w.access.phoneState ? 'granted' : 'prompt', sms: w.access.sms ? 'granted' : 'prompt', sendSms: w.access.sendSms ? 'granted' : 'prompt', callLog: w.access.callLog ? 'granted' : 'prompt'},
      sendMode: w.access.sendSms && w.access.phoneState ? 'direct' : 'handoff', mmsSend: !!options.mms && direct,
      roles: {dialer: {available: true, held: true, eligible: true}, sms: {available: true, held: smsRoleHeld, eligible: true}},
      defaultDialer: 'ai.alphacompute.alphaphone', defaultSms: smsRoleHeld ? 'ai.alphacompute.alphaphone' : 'com.android.messaging',
      subscriptions: w.access.phoneState ? [{id: 1, slot: 0, displayName: 'Synthetic SIM', carrierName: 'Synthetic Carrier', defaultSms: true, defaultVoice: true}] : null, defaultSmsSubscriptionId: w.access.phoneState ? 1 : null,
    });
    const wav = () => {
      const seconds = 2, length = seconds * 16000 * 2, bytes = new Uint8Array(44 + length), view = new DataView(bytes.buffer);
      bytes.set([82, 73, 70, 70]); view.setUint32(4, 36 + length, true); bytes.set([87, 65, 86, 69, 102, 109, 116, 32], 8);
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true); bytes.set([100, 97, 116, 97], 36); view.setUint32(40, length, true);
      let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return {mimeType: 'audio/wav', sampleRateHz: 16000, durationSeconds: seconds, data: btoa(binary)};
    };
    const names = ['ElizaSense', 'AlphaContacts', 'DailyApps', 'AlphaBrowser', 'AlphaConnection', 'AlphaDevice', 'AlphaCallState', 'AlphaOngoingCall', 'AlphaLocalAgent', 'AlphaHostedResults', 'AlphaVoiceCloud', 'AlphaNotifications', 'ElizaSystem', 'AlphaCalendar', 'AlphaNoteDocuments', 'AlphaNoteAudio', 'AlphaFiles', 'AlphaPhotos', 'DeviceApps', 'ElizaLocation', 'AlphaActionJournal', 'AlphaTelephony', 'Agent'];
    const methods = ['present', 'turnOff', 'addListener', 'removeListener', 'surfaceInfo', 'readPending', 'readPendingResult', 'readDelegationCallback', 'readSecret', 'secureRead', 'secureWrite', 'secureRemove', 'secureCompareExchange', 'get', 'save', 'remove', 'status', 'getStatus', 'getState', 'state', 'permissionState', 'permissions', 'list', 'listCalendars', 'listEvents', 'listReminders', 'listBookmarks', 'getBookmarks', 'bookmarks', 'settings', 'getSettings', 'buildInfo', 'platformCapabilities', 'capabilities', 'query', 'read', 'readJournal', 'getPending', 'readSelection', 'requestPermissions', 'create', 'edit',
      'imageCapability', 'requestAccess', 'requestRole', 'searchContacts', 'listRecentCalls', 'dial', 'placeCall', 'composeSms', 'listThreads', 'listMessages', 'observeMessages', 'markThreadRead', 'sendSms', 'cancelSmsReview', 'smsSendHistory', 'smsSendResult',
      'smsNoticePending', 'acknowledgeSmsNotice', 'mmsSendResult', 'deleteMessage',
      'contactForNumber', 'voicemailStatus', 'listVoicemail', 'fetchVoicemailAudio', 'voicemailAudio', 'voicemailPcm', 'markVoicemailHeard', 'deleteVoicemail', 'observeVoicemail', 'callState', 'answerCall', 'endCall', 'setCallAudio', 'observeCalls', 'sendCallTone', 'ongoingCall', 'showCall', 'setGoogleAgentAccess', 'phoneInfo', 'openSettings'];
    w.Capacitor = {Plugins: {}, PluginHeaders: names.filter(name => !options.preview || name !== 'AlphaBrowser').map(name => ({name, methods: methods.map(name => ({name, rtype: name === 'addListener' ? 'callback' : 'promise'}))})), nativeCallback: (plugin: string, method: string, input: any, callback: (data: unknown) => void) => {
      const id = String(++listenerSequence);
      if (plugin === 'AlphaTelephony' && method === 'addListener') messageListeners.set(id, {eventName: input.eventName, callback});
      if (plugin === 'AlphaCallState' && method === 'addListener' && input.eventName === 'callState') callStateListeners.push(callback);
      if (plugin === 'AlphaOngoingCall' && method === 'addListener' && input.eventName === 'ongoingCall') ongoingListeners.push(callback);
      return id;
    }, nativePromise: async (plugin: string, method: string, input: any) => {
      if(plugin==='ElizaSense'&&(method==='status'||method==='turnOff'))return {available:true,state:'OFF',label:'Listening off',consented:false,listening:false,microphoneOpen:false,...(method==='turnOff'?{saved:true}:{})};
      if(plugin==='AlphaBrowser'&&method==='present')return {};
      if(plugin==='AlphaBrowser'&&method==='bookmarks')return {urls:[]};
      // AC-19: Telecom's call state as the AlphaCallState plugin reports it; none by default.
      if (plugin === 'AlphaCallState' && method === 'callState') return w.deviceCallState;
      if (plugin === 'AlphaOngoingCall') {
        if (method !== 'removeListener') w.ongoingCallInputs.push([method, input]);
        if (method === 'ongoingCall') return {calls: w.ongoingCalls};
        if (method === 'showCall') return {shown: (w.ongoingCalls || []).some((call: any) => call.id === input.id)};
        if (method === 'endCall') {
          // Telecom removes the ended call; the plugin then reports the remaining calls.
          const known = (w.ongoingCalls || []).some((call: any) => call.id === input.id);
          if (known) setTimeout(() => w.setOngoingCalls(w.ongoingCalls.filter((call: any) => call.id !== input.id)), 0);
          return {ended: known};
        }
        return {};
      }
      if (plugin === 'AlphaTelephony') {
        w.telephonyCalls.push(method); w.telephonyInputs.push([method, input]);
        if (w.telephonyAnswers?.[method]) return w.telephonyAnswers[method](input);
        if (method === 'removeListener') { messageListeners.delete(input.callbackId); return {}; }
        if (method === 'imageCapability') return {version: 1, image: true, feature: 'fixture.image'};
        if (method === 'smsNoticePending') return w.smsNoticeTap || {};
        if (method === 'acknowledgeSmsNotice') { if (w.smsNoticeTap?.token === input.token) w.smsNoticeTap = undefined; return {}; }
        if (method === 'status') return status();
        if (method === 'requestAccess') { w.access[input.access] = true; return status(); }
        if (method === 'searchContacts') { const query = String(input.query || '').toLowerCase(); return {contacts: people.filter(p => !query || p.name.toLowerCase().includes(query) || p.phones.some(n => n.includes(query))).slice(0, input.limit).map(p => ({id: p.id, lookupKey: `lookup-${p.id}`, displayName: p.name, phoneNumbers: p.phones, emailAddresses: p.emails, starred: false}))}; }
        // AC-20: AlphaContactLookup over the whole address book: exact E.164 equality for the fixture's US SIM.
        if (method === 'contactForNumber') { const e164 = (n: string) => { const d = n.replace(/[^\d+]/g, ''); return d.startsWith('+') ? d : d.length === 10 ? '+1' + d : d.length === 11 && d.startsWith('1') ? '+' + d : d; }; const hit = people.find(p => p.phones.some(n => e164(n) === e164(String(input.number)))); return {name: hit ? hit.name : null}; }
        if (method === 'listRecentCalls') return {calls};
        if (method === 'placeCall') return {status: 'placed', message: ''};
        if (method === 'dial') return {status: 'handed-off', target: 'dialer', handler: 'com.android.dialer', message: 'Your phone app is open with the number.'};
        if (method === 'voicemailStatus') return {access: true, state: options.voicemail || 'ready'};
        if (method === 'listVoicemail') return {state: options.voicemail || 'ready', voicemails: (options.voicemail || 'ready') === 'ready' ? w.voicemails : []};
        if (method === 'fetchVoicemailAudio') return {status: 'ready'};
        if (method === 'voicemailPcm') return wav();
        if (method === 'markVoicemailHeard') return {status: 'marked'};
        if (method === 'deleteVoicemail') { w.voicemails = w.voicemails.filter((row: any) => row.id !== input.id); return {status: 'deleted'}; }
        if (method === 'listThreads') return {threads: w.access.sms ? threads() : [], next: null};
        if (method === 'listMessages') return {messages: [...(w.messages[input.threadId] || [])].reverse().slice(0, input.limit), next: null};
        if (method === 'deleteMessage') {
          const rows=w.messages[input.threadId]||[],row=rows.find((value:any)=>value.id===input.id);
          if(!row)return {status:'not-found',message:input};
          if(row.kind!==input.kind||row.date!==input.date)return {status:'stale',message:input};
          // As Android: only received and sent rows are settled; a pending or failed send is refused.
          if(row.status==='pending'||row.status==='failed')return {status:'not-settled',message:input};
          w.messages[input.threadId]=rows.filter((value:any)=>value!==row);
          return {status:'deleted',message:input};
        }
        if (method === 'markThreadRead') { w.readThreads = [...(w.readThreads || []), input.threadId]; return {status: 'marked'}; }
        if (method === 'composeSms') return {status: 'handed-off', target: 'sms', handler: 'com.android.messaging', message: 'Your messaging app is open with the draft.'};
        if(options.preview&&(method==='sendSms'||method==='sendComposedSms')){
          const {body,recipients,subscriptionId,operationId}=input;
          if(sendResults.has(operationId))return sendResults.get(operationId);
          const bytes=new TextEncoder().encode(JSON.stringify({body,recipients,subscriptionId,type:'sms_send'}));
          const digest=await crypto.subtle.digest('SHA-256',bytes);
          const bindingHash=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
          const createdAt=Date.now(),existing=threads().find((row:any)=>row.addresses.length===recipients.length&&row.addresses.every((address:string)=>recipients.includes(address)));
          const threadId=existing?.id||`thread:${createdAt}`;
          const row={...message(createdAt,threadId,false,0,body,recipients[0]),date:createdAt,subscriptionId,addresses:recipients};
          w.messages[threadId]=[...(w.messages[threadId]||[]),row];
          const result={kind:'sms-send',operationId,subscriptionId,bindingHash,status:'sent',parts:[{index:0,recipientIndex:0,partIndex:0,sent:'success',delivery:'unknown'}],createdAt};
          sendResults.set(operationId,result);
          return result;
        }
        if ((method === 'sendSms' || method === 'sendComposedSms') && options.controlledSms) {
          const {body, recipients, subscriptionId, operationId} = input;
          const createdAt = Date.now();
          return new Promise(resolve => {
            w.smsReview = {
              addProviderRow(id: number, threadId: string) {
                const row = {...message(id, threadId, false, 0, body, recipients[0]), date: createdAt, subscriptionId};
                w.messages[threadId] = [...(w.messages[threadId] || []), row];
              },
              async finish(status: 'sent' | 'submitted' | 'cancelled' | 'denied' | 'failed', publish = false) {
                const bytes = new TextEncoder().encode(JSON.stringify({body, recipients, subscriptionId, type: 'sms_send'}));
                const hash = await crypto.subtle.digest('SHA-256', bytes);
                const bindingHash = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
                const parts = status === 'cancelled' || status === 'denied' ? []
                  : [{index: 0, recipientIndex: 0, partIndex: 0, sent: status === 'sent' ? 'success' : status === 'failed' ? 'failed' : 'unknown', delivery: 'unknown'}];
                const receipt = {kind: 'sms-send', operationId, subscriptionId, bindingHash, status, parts, createdAt};
                if (publish) {
                  sendResults.set(operationId, receipt);
                  for (const listener of messageListeners.values()) {
                    if (listener.eventName === 'smsSendUpdated') listener.callback({operationId});
                  }
                }
                resolve(receipt);
              },
            };
          });
        }
        if (method === 'sendComposedMms' && options.controlledMms) {
          const {body, recipients, subscriptionId, operationId} = input;
          const createdAt = Date.now();
          return new Promise(resolve => {
            w.finishMms = async () => {
              const bytes = new TextEncoder().encode(JSON.stringify({attachments: [], body, recipients, subscriptionId, type: 'mms_send'}));
              const hash = await crypto.subtle.digest('SHA-256', bytes);
              const bindingHash = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
              const receipt = {kind: 'mms-send', operationId, subscriptionId, bindingHash, status: 'sent', createdAt};
              sendResults.set(operationId, receipt);
              for (const listener of messageListeners.values()) {
                if (listener.eventName === 'mmsSendUpdated') listener.callback({operationId});
              }
              resolve(receipt);
            };
          });
        }
        if (method === 'smsSendResult' || method === 'mmsSendResult') return sendResults.get(input.operationId) ?? {};
        if (method === 'smsSendHistory') return {receipts: []};
        if (method === 'phoneInfo') return {access: {phoneState: true, phoneNumbers: true, deviceIdentifiers: false}, lines: [{subscriptionId: 1, slot: 0, displayName: 'Synthetic SIM', carrierName: 'Synthetic Carrier', number: '+15550100100', countryIso: 'us', networkType: '5g', roaming: false, signalLevel: 3, embedded: false, iccid: null, imei: null}]};
        if (method === 'callState') return w.callState || {calls: []};
        return {};
      }
      if (plugin === 'AlphaContacts') {
        w.telephonyInputs.push([`contacts.${method}`, input]);
        if (method === 'requestPermissions') w.access.contacts = true;
        if (['status', 'requestPermissions'].includes(method)) return {available: true, readable: w.access.contacts, writable: w.access.contacts};
        if (method === 'list') { const query = String(input?.query || '').toLowerCase(); return {contacts: people.filter(p => !query || p.name.toLowerCase().includes(query)).map(p => ({id: p.id, lookup: `lookup-${p.id}`, revision: '1', name: p.name, starred: false, phones: p.phones, emails: p.emails})), more: false}; }
        if (method === 'get') { if(options.preview){const p=previewContacts.get(input.id);if(!p)throw Error('missing');return JSON.parse(JSON.stringify(p));}const p = people.find(row => row.id === input.id); if (!p) throw Error('missing'); return {id: p.id, lookup: `lookup-${p.id}`, displayName: p.name, starred: false, phoneNumbers: p.phones.map(number => ({number, type: 'mobile'})), emailAddresses: p.emails.map(address => ({address, type: 'home'})), version: version(p.id)}; }
        if (method === 'save') {
          if (w.contactAnswers?.save) return w.contactAnswers.save(input);
          if(options.preview){
            const old=input.id?previewContacts.get(input.id):null;if(input.id&&!old)return {status:'not-found'};if(old&&old.version!==input.version)return {status:'stale'};
            const id=input.id||String(Math.max(98,...[...previewContacts.keys()].map(Number))+1),next={...old,id,lookup:`lookup-${id}`,starred:old?.starred||false,displayName:input.displayName,phoneNumbers:input.phoneNumbers.map((v:any)=>({...v})),emailAddresses:input.emailAddresses.map((v:any)=>({...v})),version:Date.now().toString(16).padStart(64,'0')};
            for(const key of ['givenName','familyName','notes'])if(Object.hasOwn(input,key))next[key]=input[key];
            if(Object.hasOwn(input,'givenName')||Object.hasOwn(input,'familyName'))next.displayName=[next.givenName,next.familyName].filter(Boolean).join(' ')||input.displayName;
            previewContacts.set(id,next);savePreviewContacts();return {status:'saved',id,version:next.version};
          }
          return {status: 'saved', id: input.id || '99', version: 'b'.repeat(64)};
        }
        if (method === 'remove') {if(options.preview){const p=previewContacts.get(input.id);if(!p)return {status:'not-found'};if(p.version!==input.version)return {status:'stale'};previewContacts.delete(input.id);savePreviewContacts();}return {status: 'deleted'};}
      }
      if (plugin === 'AlphaConnection' && (/^sms-draft:v1:(new|thread:[1-9]\d{0,18})$/.test(input?.slot)||options.preview&&/^assistant-draft:v1:[a-f0-9]{64}$/.test(input?.slot))) {
        if (method === 'secureRead') return {value: smsDrafts.get(input.slot) ?? null};
        if (method === 'secureCompareExchange') {
          if ((smsDrafts.get(input.slot) ?? null) !== input.expectedValue) return {status: 'conflict'};
          if(options.preview){const next=new Map(smsDrafts);if(input.value===null)next.delete(input.slot);else next.set(input.slot,input.value);localStorage.setItem(draftKey,JSON.stringify([...next]));}
          if (input.value === null) smsDrafts.delete(input.slot);
          else smsDrafts.set(input.slot, input.value);
          return {status: 'saved'};
        }
      }
      if (method === 'openSettings') { w.telephonyInputs.push(['openSettings', input]); return {opened: input.page}; }
      if (method === 'surfaceInfo') return {topInset: 0, bottomInset: 0}; if (method === 'buildInfo') return {launcher: false};
      if (method === 'platformCapabilities') return {aospImage: true, contacts: true, phone: true, sms: true};
      if (['secureRead', 'readSecret'].includes(method)) return {value: null};
      return {apps: [], events: [], calendars: [], reminders: [], bookmarks: [], results: [], items: [], entries: [], pending: [], capabilities: [], available: false};
    }};
    const composer = new EventTarget() as EventTarget & {postMessage(text: string): void};
    composer.postMessage = async text => {
      const {requestId, kind, draft} = JSON.parse(text);
      const method = kind === 'sms' ? 'sendComposedSms' : 'sendComposedMms';
      try {
        const result = await w.Capacitor.nativePromise('AlphaTelephony', method, draft);
        composer.dispatchEvent(new MessageEvent('message', {data: JSON.stringify({requestId, result})}));
      } catch (error) {
        composer.dispatchEvent(new MessageEvent('message', {data: JSON.stringify({requestId, error: {message: String(error)}})}));
      }
    };
    w.alphaMessagesComposer = composer;

}
