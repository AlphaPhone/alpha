import {createMapsNotificationOpen} from '../runtime/maps-notification-open';
import {agentMapsShowable} from '../maps/agent-present';
import {mapsChatText} from '../runtime/action-message-presentation';
import {BackgroundNavigation} from '../maps/background-navigation';
import {registerPlugin} from '../platform-plugins';
import {DailyApps} from '../daily';
import {mapsEventReturnOffered,mapsEventStillThere,type MapsEventOrigin} from '../runtime/maps-event-return';
import {Capacitor} from '@capacitor/core';
import {isAndroid} from '../native';
import {NavigationVoice} from '../maps/navigation-voice';
import {speechCleanupNotice} from '../runtime/voice-states';
import {speechFailureReason} from '../ui/voice/speech-bridge-messages';
import {shareMap} from '../maps/share';
import { MapPlane, type MapBasemap } from '../maps/map-plane';
import { globalBasemap } from '../maps/basemap';
import { initializeRegionalMaps, regionalMap, regionalDiagnostics, regionalMapsConfigured } from '../maps/regional-provider';
import { initializeCloudMaps, cloudMapsCoverage, cloudMapsDiagnostics, cloudMapsBasemap } from '../maps/cloud-maps';
import { insideCloudCoverage, type CloudMapsDisclosure, isGoogleMapsCoverage, isGoogleMapsProvider, isLocalMapsPlace } from '../maps/cloud-provider';
import { describeMapsDisclosure } from '../ui/maps/cloud-provider';
import { MAPS_CONNECT_PROVIDER, MAPS_CONNECT_PROVIDER_FOR_ROUTE, mapsStartFailureText } from '../ui/maps/maps-messages';
import googleMapsLogo from '../maps/google-maps-attribution.svg?url';
import { SavedPlaces } from '../maps/saved-places';
import { NativeMapsLocation, locationPermissionGranted } from '../maps/native-location';
import { bindAgentNavigation, keepCloudMapsCoverage, residentMapsNavigationPort } from '../maps/agent-navigation';
import { publishMapsSelection, clearMapsSelection } from '../maps/agent-context';
import { MapsController } from '../maps/state';
import { mapsConnection, onMapsConnectionChange } from '../maps/runtime';
import { MapsScreenController, type MapsScreenView } from '../maps/screen';
import { connectionController } from '../runtime/connection-ui';
import { cloudServiceName } from '../runtime/cloud-protocol';
import { coordinate, place, type Place, type TravelMode } from '../maps/contracts';
import type { MapsCardPlace } from '../ui/components/chat/message-maps-parser';
import {errorNotice,ERROR_TOAST} from '../runtime/error-notice';
import type { AlphaDevicePlugin } from '../native/alpha-device';
import type { AlphaMapsTransportPlugin } from '../native/alpha-maps-transport';
import type { AlphaCalendarPlugin } from '../native/alpha-calendar';
import {copySelectedText} from '../runtime/text-share';
import {isMvpView} from './mvp-features';

type Bag = Record<string, any>;
const PIN = 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0zM15 10a3 3 0 1 1-6 0a3 3 0 1 1 6 0z';
const SWAP = 'M7 20V4M3 8l4-4 4 4M17 4v16M13 16l4 4 4-4';
const NORTH = 'M12 3l6 18-6-4-6 4z';
const CLOCK = 'M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0zM12 7v5l3 2';
const locationText = (text: string) => text === 'Your location' ? 'My location' : /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(text.trim()) ? 'Selected location' : text;
const mapsConnected = () => mapsConnection().config.status === 'configured';
/** Compact recipients at search; the information panel retains their full roles. */
function searchRecipients(disclosure: CloudMapsDisclosure | undefined): string {
  if (!disclosure) return '';
  const names = [...new Set(disclosure.recipients.map(recipient => recipient.name))];
  return names.length ? `Maps → ${names.join(', ')}` : '';
}

/**
 * Alpha's Maps screen: the shared plugin-maps screen controller rendered in the
 * prototype template. This file supplies Alpha's platform ports (native location,
 * local speech, the screen-off service, share sheet, Calendar return, the launcher
 * check for agent requests) and maps the controller's view onto template bindings.
 * Product builds use Eliza Cloud Maps; the regional gateway is a test-mocks prototype.
 */
export function installPrototypeMapsAdapter(Component: { prototype: Bag }, views: Record<string, Bag>): () => void {
  const device=registerPlugin<Pick<AlphaDevicePlugin,'openSettings'>>('AlphaDevice');
  const module = views.maps; if (!module) return () => {};
  const original = { render: module.render, back: module.back, onLeave: module.onLeave, reply: module.reply, suggestions: module.suggestions, ongoing: module.ongoing };
  let api: Bag | undefined, disposed=false, renders=0,placeShown=false;
  let planeBasemap:MapBasemap|undefined, plane: MapPlane | undefined, planeElement: HTMLElement | undefined;
  let mapGeneration=0,mapFailed=false,mapObserver:MutationObserver|undefined;
  let mapCopyright='';
  // The map is turned or tilted away from north up; the compass shows only then.
  let mapRotated=false,compassElement:HTMLElement|undefined,mapBearing=0;
  const turnCompass=()=>{compassElement?.style.setProperty('--alpha-map-bearing',`${-mapBearing}deg`);};
  // The owner's own recent searches, newest first. They stay in memory for this session only:
  // nothing is stored on the phone or sent anywhere, and a Maps account change drops them.
  let recentSearches:string[]=[];
  const rememberSearch=(text:string)=>{
    const value=text.trim();
    if(!value||value.length>300||/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(value))return;
    recentSearches=[value,...recentSearches.filter(item=>item.toLowerCase()!==value.toLowerCase())].slice(0,5);
  };
  let pendingHandoff: {query:string}|undefined, mapsController:MapsController|undefined;
  let queryTimer:ReturnType<typeof setTimeout>|undefined,originTimer:ReturnType<typeof setTimeout>|undefined;
  let queryDraft:string|undefined,originDraft:string|undefined,searchEpoch=0,submittedQueryEpoch=-1;
  let submittedOriginEpoch=-1,submittedOriginText='',submittedOriginKind:'search'|'route'|'location'='route';
  const cancelSearchTimers=()=>{if(queryTimer!==undefined)clearTimeout(queryTimer);if(originTimer!==undefined)clearTimeout(originTimer);queryTimer=originTimer=undefined;};
  const retireSearch=()=>{++searchEpoch;cancelSearchTimers();queryDraft=originDraft=undefined;};
  // A chat card's request, taken once: a search around the phone, directions from the phone, a planned route to draw,
  // or the exact place the agent resolved (with directions to it from the phone when `fromHere`).
  type AgentRoute={origin:string;destination:string;name:string;travelMode:TravelMode};
  type AgentPlace={place:MapsCardPlace;fromHere:boolean;travelMode?:TravelMode};
  // `epoch` is searchEpoch after the flow's own last step: any later user action in Maps moves it and ends the flow.
  // `directions`: after the search, directions to the closest result start from the same fix.
  type NearSearch={query:string;located:boolean;epoch:number;directions?:{travelMode?:TravelMode}};
  type FromHere={query:string;stage:'search'|'place';epoch:number;closest:boolean;travelMode?:TravelMode};
  let nearSearch:NearSearch|undefined,pendingRoute:AgentRoute|undefined,pendingPlace:AgentPlace|undefined,fromHere:FromHere|undefined;
  const retireCard=()=>{nearSearch=pendingRoute=pendingPlace=fromHere=undefined;const maps=api?.get('maps');if(maps&&(maps.nearMe||maps.fromHere||maps.agentRoute||maps.agentPlace))api!.set({nearMe:null,fromHere:null,routeMode:null,agentRoute:null,agentPlace:null});};
  // Asks this phone for a fresh fix (the platform may prompt), then searches around it; see the render below.
  const locateThenSearch=(near:NearSearch)=>{retireSearch();screen.unwind();near.located=true;nearSearch=near;screen.recenter();near.epoch=searchEpoch;};
  // A chat card's place under this phone's provider: a Cloud place is read again by its id, any other is a named pin.
  const cardPlace=(value:MapsCardPlace):{place:Place;resolveDetails:boolean}|undefined=>{
    const config=mapsConnection().config;
    if(config.status!=='configured')return undefined;
    const cloud=!regionalMapsConfigured&&(value.provider==='eliza-cloud'||value.provider===config.providerId);
    try{return {place:place({providerId:config.providerId,id:cloud?value.providerPlaceId:'coordinates',name:value.name,coordinate:coordinate({latitude:value.latitude,longitude:value.longitude}),...(value.formattedAddress?{address:value.formattedAddress}:{}),attribution:cloudMapsCoverage()?.attribution||'Chosen in chat',fetchedAt:Date.now()},config.providerId),resolveDetails:cloud};}
    catch{return undefined;}
  };
  // Directions to a place the card resolved (or the closest match it asked for), started from a fresh fix: the card's
  // tap is the explicit location request, so the platform may prompt. Any later step in Maps ends it.
  const directionsFromHere=(target:Place,resolveDetails:boolean,travelMode?:TravelMode)=>{
    const current=mapsController?.snapshot().mode??'drive',mode=travelMode&&mapsController?.capabilities().modes.includes(travelMode)?travelMode:current;
    const showing=surface.showDirections(target,mode,resolveDetails),epoch=searchEpoch;
    void showing.then(()=>{if(epoch===searchEpoch&&active())screen.locate();},()=>{});
  };
  const mapsDiagnostics=()=>regionalMapsConfigured?regionalDiagnostics():cloudMapsDiagnostics();
  const active=()=>!disposed&&!document.hidden&&!!api?.isActive();
  const dropPlane=()=>{++mapGeneration;mapObserver?.disconnect();mapObserver=undefined;mapFailed=false;mapCopyright='';mapRotated=false;mapBearing=0;turnCompass();plane?.destroy();plane=undefined;planeElement=undefined;planeBasemap=undefined;};
  const googleProviders = new Set<string>();
  const isGoogleProvider = (id?: string) => !!id && (googleProviders.has(id) || isGoogleMapsProvider(id, cloudMapsCoverage()));
  const googleContent = () => {
    if (regionalMapsConfigured) return false;
    const coverage = cloudMapsCoverage();
    if (isGoogleMapsCoverage(coverage)) googleProviders.add(coverage!.providerId);
    return isGoogleMapsCoverage(coverage) || isGoogleProvider(mapsController?.snapshot().route.value?.providerId);
  };
  const localPlace = (view: MapsScreenView) => {
    const controller = mapsController?.snapshot().provider;
    return isLocalMapsPlace(
      view.place, regionalMap()?.providerId || cloudMapsCoverage()?.providerId, isGoogleProvider,
      controller ? {controller, connection: mapsConnection().config} : undefined,
    );
  };
  const navigationVoice = new NavigationVoice(
    error => { const reason = speechFailureReason(error); screen.notify(speechCleanupNotice(error) || (reason ? `${reason} Navigation voice paused.` : 'Voice paused')); },
    // Navigation speech is deferred; the assistant owns its separate speech lifecycle.
    () => false,
  );
  const navigationTransport=registerPlugin<AlphaMapsTransportPlugin>('AlphaMapsTransport');
  const background=new BackgroundNavigation(navigationTransport,()=>Capacitor.isNativePlatform());
  // Alpha's navigation sheet has no Reroute control; the shared off-route copy names one. Point only
  // at the End control that remains (the screen-off notification keeps its own Stop action).
  const offRouteCopy=(text:string)=>text==='Off route. Tap Reroute from here.'?'Off route. End navigation to plan a new route.'
    :text==='Open Maps to reroute from here or stop.'?'Open Maps to end navigation.':text;
  const navigationBackground={
    active:()=>background.active(),
    start:(title:string,text:string,onStopped:(reason:string)=>void)=>background.start(title,offRouteCopy(text),onStopped),
    update:(title:string,text:string)=>background.update(title,offRouteCopy(text)),
    stop:()=>background.stop(),
    // Arrival with Maps off screen: the owner is told where guidance ended before the ongoing
    // notification goes. Native posts it only for the session this renderer owns.
    arrive:async(destination:string)=>{
      // The notice is best effort; the session ends either way.
      if(background.active()&&!active())
        try{await navigationTransport.navigationArrived({title:destination?`Arrived at ${locationText(destination)}`:'Arrived',text:'Navigation ended.'});}catch{}
      await background.stop();
    },
  };
  // A Cloud read already made or under way for this account is not repeated: a second read would
  // uninstall the provider an open Maps search is using. An account change retires it first (cloud-maps.ts).
  const readCloudMaps = () => cloudMapsCoverage() ? Promise.resolve() : initializeCloudMaps();
  const screen: MapsScreenController = new MapsScreenController({
    connection: mapsConnection,
    onConnectionChange: onMapsConnectionChange,
    initialize: () => regionalMapsConfigured ? initializeRegionalMaps() : readCloudMaps(),
    diagnostics: () => regionalMapsConfigured ? regionalDiagnostics() : cloudMapsDiagnostics(),
    coverage: () => {
      const region=regionalMap();
      if(region)return {name:region.region,mapRestricted:true,contains:point=>point.longitude>=region.bounds[0]&&point.latitude>=region.bounds[1]&&point.longitude<=region.bounds[2]&&point.latitude<=region.bounds[3]};
      const cloud=cloudMapsCoverage();
      return cloud&&{name:cloud.regions.map(item=>item.name).join(', '),mapRestricted:false,contains:point=>insideCloudCoverage(cloud,point)};
    },
    attribution: () => regionalMap()?.attribution || cloudMapsCoverage()?.attribution || '',
    createController: (config, provider) => (mapsController = new MapsController(
      config, provider, new SavedPlaces(undefined, isGoogleProvider), undefined, isGoogleProvider,
    )),
    navigationLocation: new NativeMapsLocation(),
    agentLocation: new NativeMapsLocation(),
    locationGranted: locationPermissionGranted,
    voice: navigationVoice,
    background: navigationBackground,
    share: (data, signal) => {
      signal.throwIfAborted();
      const view = screen.view();
      if ((view.place && !localPlace(view)) || (view.mode !== 'place' && googleContent())) return Promise.resolve('closed');
      return shareMap(data, signal);
    },
    openWebsite: url => {
      if (Capacitor.isNativePlatform()) void DailyApps.perform({ action: 'browser', url: url.href }).then(result => { if (result.status !== 'opened') api?.toast(errorNotice(result.message, 'Couldn’t open'), ERROR_TOAST); }, () => api?.toast('Couldn’t open', ERROR_TOAST));
      else window.open(url.href, '_blank', 'noopener,noreferrer');
    },
    active,
    invalidate: () => { if (!disposed && !document.hidden && (active() || screen.isNavigating())) api?.set({ nativeMapsRevision: ++renders }); },
    toast: text => api?.toast(text),
    discardHandoff: () => { retireSearch(); pendingHandoff=undefined; const maps=api?.get('maps'); if(maps&&(maps.query!=null||maps.nearMe||maps.fromHere||maps.searchNear))api!.set({query:null,nearMe:null,fromHere:null,searchNear:null}); },
    handoffReturn: () => !!mapsEventReturnOffered(api?.get('maps').fromEvent,api?.S.stack,screen.isNavigating()),
    released: dropPlane,
    // With no Maps provider on Android, an event's location can be handed to an installed map
    // app, only when the user taps for it. The exact hand-off text is sent; no route is shown.
    ...(isAndroid ? { mapsApp: {
      available: () => DailyApps.capabilities().then(result => result.actions.some(row => row.action === 'maps' && row.available)),
      open: (text: string) => DailyApps.perform({ action: 'maps', query: text }).then(result => ({ opened: result.status === 'opened', message: result.message })),
    } } : {}),
    deniedLocationHelp: 'Location off',
    publishContext: publishMapsSelection,
    clearContext: clearMapsSelection,
  });
  // Explicit return to the event whose location opened Maps. It checks that exact event still exists,
  // restores Calendar on it and pops the cross-app stack. It never sets a Maps query.
  let returningToEvent: {raw: unknown; abort: AbortController} | undefined;
  const calendarPlugin=registerPlugin<Pick<AlphaCalendarPlugin,'list'>>('AlphaCalendar');
  const returnIsCurrent = (currentApi: Bag, raw: unknown) =>
    !disposed && !document.hidden && !shell?.pageSuspended && currentApi.isActive()
      && currentApi.get('maps').fromEvent === raw && !!mapsEventReturnOffered(raw, api?.S.stack, screen.isNavigating());
  const retireEventReturn = () => {
    const previous = returningToEvent;
    returningToEvent = undefined;
    previous?.abort.abort();
  };
  async function returnToEvent(currentApi: Bag, origin: MapsEventOrigin, raw: unknown) {
    if (!returnIsCurrent(currentApi, raw) || returningToEvent?.raw === raw) return;
    retireEventReturn();
    const attempt = {raw, abort: new AbortController()};
    returningToEvent = attempt;
    try{
      // Only a ready read without the event withdraws the control; a refused or failed read keeps it.
      let outcome:'found'|'missing'|'permission'|'unknown'='unknown';
      try{
        if (origin.version === 2) {
          outcome = await currentApi.checkCanonicalCalendarReturn?.(origin, attempt.abort.signal) ?? 'unknown';
        } else {
          const result = await calendarPlugin.list({begin: origin.begin - 1, end: origin.begin + 1});
          outcome = result.status === 'ready' ? (mapsEventStillThere(origin, result.events) ? 'found' : 'missing') :
            result.status === 'permission-required' ? 'permission' : 'unknown';
        }
      } catch { /* A thrown read says nothing about the event. */ }
      if (returningToEvent !== attempt || !returnIsCurrent(currentApi, raw)) return;
      if(outcome==='permission'){currentApi.toast('Allow Calendar');return;}
      if(outcome==='unknown'){currentApi.toast('Couldn’t check');return;}
      if(outcome==='missing'){currentApi.set({fromEvent:null});currentApi.toast('Event moved');return;}
      const stack=(api?.S.stack||[]).slice(0,-1);
      // Unwind this visit's Maps layers (route, place, results, search text) as system Back would, so
      // nothing of the hand-off is left to show or replay when Maps is opened again.
      screen.unwind();
      currentApi.setView('calendar',{...(origin.version===2?{calendarAuthority:'canonical'}:{}),open:origin.rowId,openDay:origin.day,day:origin.day,month:null,form:null});
      currentApi.open('calendar',{keepState:true});currentApi.shell({stack});
    } finally {
      if (returningToEvent === attempt) returningToEvent = undefined;
    }
  }
  module.back = () => {retireSearch();retireCard();return screen.back();};
  module.onLeave = () => {
    retireSearch();retireCard();
    retireEventReturn();
    screen.leaveView();
  };
  module.ongoing = () => { const nav=screen.isNavigating()?screen.view().navigation:undefined; return nav?{label:nav.arrived?'Arrived':nav.remainingTime,icon:'pin'}:null; };
  module.reply = () => null;
  module.suggestions = () => mapsConnected() ? [...(placeShown ? ['Help me with this place'] : []), 'Explain Maps coverage'] : ['Help me with Maps', 'Explain location permissions'];
  module.render = (st: Bag, currentApi: Bag) => {
    api = currentApi;
    // Cross-app navigation carries a one-use search, not a selected destination.
    // Consume it outside render and fence it against leaving or a newer action.
    // "Directions to X from here": the hand-off below searches the destination; the stages after the view finish it.
    if(st.fromHere&&!st.nearMe&&typeof st.query==='string'&&st.query.trim()&&!pendingHandoff)fromHere={query:st.query.trim(),stage:'search',epoch:-1,closest:false};
    if(typeof st.query==='string'&&st.query.trim()&&!st.nearMe&&!pendingHandoff){
      // A chat card for "pharmacy near the Ferry Building" names the point its places were found around.
      const near=st.searchNear&&Number.isFinite(st.searchNear.latitude)&&Number.isFinite(st.searchNear.longitude)?{latitude:Number(st.searchNear.latitude),longitude:Number(st.searchNear.longitude)}:undefined;
      const handoff=pendingHandoff={query:st.query};
      queueMicrotask(()=>{
        if(pendingHandoff!==handoff)return;pendingHandoff=undefined;
        if(disposed||!currentApi.isActive()||currentApi.get('maps').query!==handoff.query)return;
        const fromEvent=!!currentApi.get('maps').fromEvent;
        currentApi.set({query:null,fromHere:null,searchNear:null});screen.handoff(handoff.query,fromEvent,near);if(fromHere)fromHere.epoch=searchEpoch;
      });
    }
    // A chat card's "near you" search: the user's tap asks this phone for its position (the platform may
    // prompt), then Maps searches around it. The position goes to the Maps service only, as for any search.
    // A second tap replaces the first request; the phone is asked for one fix either way.
    if(st.nearMe&&typeof st.query==='string'&&st.query.trim()&&nearSearch?.query!==st.query.trim()&&!pendingHandoff){
     // With `fromHere` the card names a kind of place: directions go to the closest match around the fix.
     const near:NearSearch=nearSearch={query:st.query.trim(),located:false,epoch:-1,...(st.fromHere?{directions:st.routeMode?{travelMode:st.routeMode}:{}}:{})};
     queueMicrotask(()=>{
      if(nearSearch!==near)return;
      if(disposed||!currentApi.isActive()||currentApi.get('maps').query!==st.query){nearSearch=undefined;return;}
      // Leave any route, place or results of an earlier visit first, as system Back would.
      currentApi.set({query:null,nearMe:null,fromHere:null,routeMode:null});locateThenSearch(near);
     });
    }
    else if(st.nearMe&&nearSearch&&!pendingHandoff)queueMicrotask(()=>{if(!disposed&&currentApi.isActive()&&currentApi.get('maps').nearMe)currentApi.set({query:null,nearMe:null,fromHere:null,routeMode:null});});
    // A chat card's exact place, as the agent resolved it: selected by its provider id and coordinates under its
    // own name, never searched again by name. With `fromHere` the card's tap is also the location request.
    if(st.agentPlace&&!pendingPlace){
     const card=pendingPlace=st.agentPlace as AgentPlace;
     queueMicrotask(()=>{
      if(pendingPlace!==card)return;pendingPlace=undefined;
      if(disposed||!currentApi.isActive()||currentApi.get('maps').agentPlace!==card)return;
      if(mapsConnection().config.status!=='configured'&&!mapsDiagnostics().error){screen.ensure();return;}
      currentApi.set({agentPlace:null});retireSearch();
      const shown=cardPlace(card.place);
      // Without a provider the screen's own message explains why; the pin keeps the place's name.
      if(!shown){screen.handoff(`${card.place.latitude}, ${card.place.longitude}`,false);screen.rename(card.place.name);return;}
      if(card.fromHere)directionsFromHere(shown.place,shown.resolveDetails,card.travelMode);
      else void surface.showPlace(shown.place,shown.resolveDetails).catch(()=>{});
     });
    }
    // A chat route card: the same pin, starting point and travel mode the user could enter by hand.
    if(st.agentRoute&&!pendingRoute){
     const route=pendingRoute=st.agentRoute as AgentRoute;
     queueMicrotask(()=>{
      if(pendingRoute!==route)return;pendingRoute=undefined;
      if(disposed||!currentApi.isActive()||currentApi.get('maps').agentRoute!==route)return;
      // Maps may still be reading its provider on the first visit of a session: keep the card's route in view
      // state, and the render that follows the connection change takes it. A settled failure shows its message below.
      if(mapsConnection().config.status!=='configured'&&!mapsDiagnostics().error){screen.ensure();return;}
      currentApi.set({agentRoute:null});retireSearch();
      screen.handoff(route.destination,false);screen.rename(route.name);screen.ensure();
      screen.openDirections();screen.setOriginText(route.origin);
      // A travel mode this provider does not offer keeps the screen's notice; no route in another mode is asked for.
      const offered=screen.view().directions?.modes.find(choice=>choice.mode===route.travelMode)?.available;
      screen.setMode(route.travelMode);if(offered)screen.planOrigin();
     });
    }
    const view = screen.view();
    if(nearSearch?.located){
     const near=nearSearch,position=mapsController?.snapshot().position;
     if(near.epoch!==searchEpoch)nearSearch=undefined;
     // The search is ranked around the fix itself, not around the area the map last showed.
     else if(position?.phase==='ready'&&position.value){const fix=position.value.coordinate;nearSearch=undefined;queueMicrotask(()=>{if(!disposed&&currentApi.isActive()){screen.setViewport(fix,15);screen.searchFor(near.query);if(near.directions)fromHere={query:near.query,stage:'search',epoch:searchEpoch,closest:true,...near.directions};}});}
     // A refused or failed fix keeps the screen's own location message; nothing is searched elsewhere.
     else if(position?.phase==='error'||!view.status.locationBusy&&position?.phase!=='loading')nearSearch=undefined;
    }
    if(fromHere&&!pendingHandoff){
     const pending=fromHere,first=view.results.find(row=>!row.saved);
     // The agent offers this only after its own search resolved the name to one place, so the first match is taken.
     if(pending.epoch!==searchEpoch||view.query!==pending.query||view.noResults)fromHere=undefined;
     else if(pending.stage==='search'&&view.mode==='results'&&first){pending.stage='place';queueMicrotask(()=>{
      if(fromHere!==pending||disposed||!currentApi.isActive())return;
      // A kind of place ("the nearest pharmacy") takes the match closest to the fix the search ran around.
      const closest=pending.closest?screen.closest():undefined;
      if(pending.closest){fromHere=undefined;if(closest)directionsFromHere(closest,true,pending.travelMode);}
      else{screen.choose(first.key);pending.epoch=searchEpoch;}
     });}
     else if(pending.stage==='place'&&view.mode==='place'&&view.place?.canDirections){
      fromHere=undefined;
      // The card's tap is the explicit location request: the platform may prompt, and the route starts from the fix.
      queueMicrotask(()=>{if(!disposed&&currentApi.isActive()){screen.openDirections();screen.locate();}});
     }
    }
    // Opening Maps to nothing in particular: with location already allowed, the screen shows
    // where the phone is (once per visit, never a prompt). A hand-off or card keeps its own flow.
    if(!st.query&&!st.nearMe&&!st.agentPlace&&!st.agentRoute&&!st.fromHere&&!pendingHandoff&&!pendingPlace&&!pendingRoute&&!nearSearch&&!fromHere)
      queueMicrotask(()=>{if(active())screen.showPositionOnOpen();});
    placeShown = !!view.place;
    // Calling the original with neutral state retains visual tokens without
    // generating sample place cards, address guesses, routes or timers.
    const data = original.render({ ...st, query: null, place: null, directions: null, nav: false, saved: [], pan: null }, currentApi);
    bind(data, view, st, currentApi);
    return data;
  };
  function cloudCredit(directionsOpen: boolean) {
    const route = directionsOpen ? mapsController?.snapshot().route : undefined;
    const text = (route?.phase === 'ready' && route.value?.attribution) || cloudMapsCoverage()?.attribution || '';
    return text.length > 200 ? `${text.slice(0, 199)}…` : text;
  }
  function bind(data: Bag, view: MapsScreenView, st: Bag, currentApi: Bag) {
    // A committed route action replaces the edited origin and retires its delayed search.
    if(originDraft!==undefined&&view.directions?.originText!==originDraft)retireSearch();
    const submitQuery=()=>{
      if(queryTimer!==undefined)clearTimeout(queryTimer);queryTimer=undefined;
      if(!active()||!currentApi.isActive())return;
      const draft=queryDraft,text=draft??screen.view().query,state=mapsController?.snapshot();queryDraft=undefined;
      // Enter after the debounce reuses this input's in-flight or ready search.
      // A new edit, refused request or changed provider still admits a new search.
      if(draft===undefined&&submittedQueryEpoch===searchEpoch&&!pendingHandoff&&currentApi.get('maps').query==null&&state?.query===text.trim()&&(state.search.phase==='loading'||state.search.phase==='ready'||state.search.phase==='empty'))return;
      ++searchEpoch;
      screen.setQuery(text);if(text.trim()){screen.submit();submittedQueryEpoch=searchEpoch;}
    };
    const submitOrigin=()=>{
      if(originTimer!==undefined)clearTimeout(originTimer);originTimer=undefined;
      if(!active()||!currentApi.isActive())return;
      const draft=originDraft,text=draft??screen.view().directions?.originText??'',state=mapsController?.snapshot();originDraft=undefined;
      const phase=submittedOriginKind==='search'?state?.originSearch.phase:state?.route.phase;
      const reusable=submittedOriginKind==='location'
        ? state?.position.phase==='loading'||state?.position.phase==='ready'&&(state.route.phase==='loading'||state.route.phase==='ready')
        : phase==='loading'||phase==='ready'||phase==='empty';
      const sameText=text===submittedOriginText||submittedOriginKind==='location'&&(text==='My location'||text==='Your location');
      if(draft===undefined&&submittedOriginEpoch===searchEpoch&&!pendingHandoff&&currentApi.get('maps').query==null&&sameText&&reusable)return;
      ++searchEpoch;
      if(text==='My location'||text==='Your location'){
        screen.locate();submittedOriginEpoch=searchEpoch;submittedOriginText=text;submittedOriginKind='location';return;
      }
      if(screen.view().directions?.originText!==text)screen.setOriginText(text);
      if(text.trim()){
        screen.planOrigin();const next=screen.view();submittedOriginEpoch=searchEpoch;
        submittedOriginText=next.directions?.originText??text;submittedOriginKind=next.mode==='origin'?'search':'route';
      }
    };
    const schedule=(origin:boolean,text:string)=>{
      const token=++searchEpoch,provider=mapsConnection().provider,owner=shell;
      cancelSearchTimers();pendingHandoff=undefined;
      if(origin){originDraft=text;queryDraft=undefined;if(view.mode==='origin')screen.setQuery(text);else screen.setOriginText(text);}else{queryDraft=text;originDraft=undefined;}
      currentApi.set({query:null,nativeMapsRevision:++renders});
      const timer=setTimeout(()=>{
        if(token!==searchEpoch||provider!==mapsConnection().provider||shell!==owner||!owner?.live||!active()||!currentApi.isActive())return;
        if(origin)submitOrigin();else submitQuery();
      },350);
      if(origin)originTimer=timer;else queryTimer=timer;
    };
    const status = view.status, region = regionalMap(), raster = cloudMapsBasemap();
    const coverage = cloudMapsCoverage();
    const connectedGoogle = !region && googleContent();
    const restrictedPlace = !!view.place && !localPlace(view);
    const googlePlace = restrictedPlace && isGoogleProvider(view.place?.providerId);
    const placeSourceVerified = !restrictedPlace || view.place?.origin === 'provider' && googlePlace && isGoogleMapsCoverage(coverage);
    const results = view.results.filter(row => !row.saved || view.saved.some(item =>
      row.key === 'saved:' + item.id && isLocalMapsPlace(
        {origin:'saved', providerId:item.providerId}, region?.providerId || coverage?.providerId, isGoogleProvider,
      ),
    ));
    const savedListVisible = view.mode === 'base' || view.mode === 'results' && view.emptyQuery;
    const restrictedSaved = savedListVisible ? view.saved.filter(item => !isLocalMapsPlace(
      {origin:'saved', providerId:item.providerId}, region?.providerId || coverage?.providerId, isGoogleProvider,
    )) : [];
    const googleMaps = googlePlace || restrictedSaved.some(item => isGoogleProvider(item.providerId)) || connectedGoogle;
    const googleOnly = (!restrictedPlace || googlePlace) && restrictedSaved.every(item => isGoogleProvider(item.providerId));
    const basemap = restrictedPlace || restrictedSaved.length
      ? googleOnly && isGoogleMapsCoverage(coverage) ? raster : undefined
      : region || raster || (googleMaps ? undefined : globalBasemap);
    const globalMap = basemap === globalBasemap;
    // Alpha's Cloud provider is operator-owned. Translate only the generic setup
    // prompt after a service-configuration refusal; preserve other recovery messages.
    const cloudFailure = cloudMapsDiagnostics();
    const statusText = !regionalMapsConfigured && cloudFailure.error === 'unconfigured' &&
      [MAPS_CONNECT_PROVIDER, MAPS_CONNECT_PROVIDER_FOR_ROUTE, mapsStartFailureText(cloudFailure)].includes(status.text)
      ? 'Maps unavailable' : offRouteCopy(status.text);
    const directionsOpen = view.mode === 'directions' || view.mode === 'origin' || view.mode === 'navigation';
    const isPlace = view.mode === 'place', isResults = view.mode === 'results' || view.mode === 'origin', isNav = view.mode === 'navigation';
    const sheetHeight = directionsOpen ? 300+(view.directions?.routes.length??0)*50 : isPlace ? (view.place?.phone ? 452 : 400) : 520;
    // The ⓘ and recenter buttons share one baseline: just above an open sheet, else above the dock.
    const recBottom = isPlace || isResults || (directionsOpen && !isNav) ? sheetHeight + 14 : 124;
    Object.assign(data, {
      rootRef:(element:HTMLElement)=>{if(element)element.dataset.mapDiagnostics=JSON.stringify({...view.diagnostics,agentNavigation:{offered:agentNavigation.registered(),relay:residentMapsNavigationPort.relay}});},
      // Who receives search text and route points, from the connected Cloud provider.
      searchDisclosure:region?'Maps → Regional provider':searchRecipients(coverage?.disclosure),
      providerDisclosure:region?'Searches, search areas and route points are sent to the configured regional Maps provider.':describeMapsDisclosure(coverage?.disclosure),
      locationDisclosure:region||coverage?'Routes share selected points':'',
      cloudCredit:cloudCredit(directionsOpen),
      hasNativeMap:true, globalBasemap:globalMap, regionalBasemap:!!region && basemap === region,
      cloudBasemap:!!raster && basemap === raster && !googleMaps, googleMaps, googleMapsLogo,
      mapInfoControl:!googleMaps,
      googleMapMissing:googleMaps && !basemap,
      mapLabel:googleMaps ? 'Google Maps' : globalMap ? 'World map' : basemap === region && region ? 'Regional map' : basemap ? 'Cloud map' : 'Map',
      mapAttribution:region && basemap === region ? region.attribution : raster && basemap === raster ? (planeBasemap === raster && mapCopyright || raster.attribution) : '',
      attributionBottom:recBottom,
      mapRef:(element:HTMLElement)=>{
        if (!element) return;
        if (!basemap) {
          if (planeElement) dropPlane();
          delete element.dataset.mapReady;
          delete element.dataset.mapError;
          queueMicrotask(() => { if (active() && element.isConnected && !planeElement) screen.setMapState('error'); });
          return;
        }
        if(element!==planeElement||planeBasemap!==basemap){
          mapObserver?.disconnect();plane?.destroy();mapFailed=false;mapCopyright='';planeElement=element;planeBasemap=basemap;const generation=++mapGeneration;delete element.dataset.mapReady;delete element.dataset.mapError;
          const current=()=>generation===mapGeneration&&planeElement===element&&!disposed&&!!api?.isActive();
          try{
            plane=new MapPlane(element,basemap,()=>{if(!current())return;mapFailed=true;screen.setMapState('error');},data.C,id=>{retireSearch();screen.pin(id);},text=>{if(current()&&text!==mapCopyright){mapCopyright=text;screen.refresh();}},()=>{retireSearch();screen.stopFollowing();},(center,zoom)=>{if(current())screen.setViewport(center,zoom);},point=>{if(current()){retireSearch();screen.dropPin(point);}},(rotated,bearing)=>{if(!current())return;mapBearing=bearing;turnCompass();if(rotated!==mapRotated){mapRotated=rotated;currentApi.set({nativeMapsRevision:++renders});}});
            mapObserver=new MutationObserver(()=>{if(current())screen.setMapState(element.dataset.mapError ? 'error' : element.dataset.mapReady === 'true' ? 'ready' : 'loading');});
            mapObserver.observe(element,{attributes:true,attributeFilter:['data-map-ready','data-map-error']});
          }catch{mapFailed=true;element.replaceChildren();queueMicrotask(()=>{if(current())screen.setMapState('error');});}
        }
        plane?.update(view.map.selected,view.map.route,view.map.overlay);
      },
      native: true, nativeStatusVisible:status.visible, nativeStatus: statusText, nativeStatusTop: directionsOpen?232:isPlace ? 128 : view.mode==='results' ? 130 : 174,
      nativeSavedEmpty: !view.saved.length, nativeLocationBusy: status.locationBusy, nativeLocation: () => {retireSearch();screen.locate();},
      nativeLocationState:status.location,nativeMapState:status.map,nativeMapStatus:status.mapText,
      nativeLocationLabel:status.locationBusy?status.locationLabel:'My location',nativeLocationDenied:status.locationDenied,nativeStatusControls:status.controls,
      nativeLocationHelp:status.locationHelp,
      nativeLocationSettings:()=>{if(!active())return;void device.openSettings({page:'privacy'}).catch(()=>{if(!disposed&&currentApi.isActive())screen.notify('Couldn’t open settings');});},
      nativeManualLocation:()=>{if(!active())return;screen.manualLocation();queueMicrotask(()=>{if(active())document.querySelector<HTMLInputElement>('input[aria-label="Search places"]')?.focus();});},
      nativeMapRetry:status.mapRetry,
      retryNativeMap:()=>{
        if(!active())return;
        dropPlane();
        if (!basemap && !regionalMapsConfigured) void initializeCloudMaps();
        screen.retryMap();
      },
      mode:view.mode==='navigation'?'nav':view.mode==='directions'?'dir':view.mode, isBase:view.mode==='base',isResults,isPlace,isDir:view.mode==='directions',isNav,
      showSearch:view.showSearch, showRec:!isNav||view.map.overlay.follow===false,
      q: originDraft??queryDraft??view.query, hasQ: !!(originDraft??queryDraft??view.query), searchIcon:view.searchLead==='back'?'M15 5l-7 7 7 7':data.searchIcon, searchLabel: view.searchLead === 'back' ? 'Back' : 'Search', leadIsSearch: view.searchLead !== 'back',
      searchLead: () => {retireSearch();screen.searchLead();},
      onQ: (event: Event) => schedule(view.mode==='origin',(event.target as HTMLInputElement).value),
      focusQ: () => {},
      qKey: (event: KeyboardEvent) => { if (event.key === 'Enter') { event.preventDefault();if(view.mode==='origin')submitOrigin();else{rememberSearch(queryDraft??screen.view().query);submitQuery();}(event.target as HTMLInputElement).blur(); } },
      clearQ: () => {retireSearch();screen.clearQuery();},
      chips: view.saved.map(item => ({ id: 'saved:' + item.id, label: item.label, d: PIN, go: () => {retireSearch();screen.chooseSaved(item.id);} })),
      // "Nearest X" from the map itself: around this phone's fix, located first when there is none yet.
      cats: data.cats.map((category: Bag) => ({ ...category, go: () => {
        const fix=mapsController?.snapshot().position;
        if(fix?.phase==='ready'&&fix.value){retireSearch();screen.setViewport(fix.value.coordinate,15);screen.searchFor(category.query);}
        else locateThenSearch({query:category.query,located:true,epoch:-1});
      } })),
      savedRows: view.saved.map(item => ({ id: 'saved:' + item.id, name: locationText(item.label), sub: '', d: PIN, go: () => {retireSearch();screen.chooseSaved(item.id);} })),
      results: (queryDraft!==undefined||originDraft!==undefined?[]:results).map(row => ({ id: row.key, name: locationText(row.name), sub: locationText(row.detail), d: PIN, go: () => {if(view.mode==='results')rememberSearch(view.query);retireSearch();screen.choose(row.key);} })),
      // Recent searches, offered with the saved places while the search field is empty.
      hasRecent: savedListVisible && recentSearches.length > 0 && queryDraft===undefined,
      recentRows: savedListVisible ? recentSearches.map(text => ({ id: 'recent:' + text, text, d: CLOCK, go: () => {if(!active())return;retireSearch();rememberSearch(text);screen.searchFor(text);} })) : [],
      // Clear removes the Recent list it sits in; focus moves on to the sheet's first control.
      clearRecent: () => {
        const focused=!!(document.activeElement as HTMLElement|null)?.closest?.('[data-alpha-maps-recent]');
        recentSearches=[];currentApi.set({nativeMapsRevision:++renders});
        if(focused)requestAnimationFrame(()=>{if(active())document.querySelector<HTMLElement>('[data-alpha-maps-sheet="results"] button')?.focus();});
      },
      // North up: shown while the map is turned or tilted, except while guidance turns it with the heading.
      compass: mapRotated && !(isNav && view.map.overlay.follow), compassD: NORTH,
      compassRef: (element: HTMLElement) => {compassElement=element||undefined;turnCompass();},
      // The compass leaves once the map is north up; focus moves to the map it turned.
      northUp: () => {if(!active())return;if(compassElement&&document.activeElement===compassElement)planeElement?.querySelector<HTMLElement>('canvas')?.focus({preventScroll:true});plane?.resetNorth();},
      compassBottom: isNav ? 198 : recBottom + 60,
      hasResults: queryDraft===undefined&&originDraft===undefined&&results.length > 0, noResults: queryDraft===undefined&&originDraft===undefined&&(view.noResults || view.hasResults && results.length === 0), emptyQ: view.emptyQuery,
      recenter: () => {retireSearch();screen.recenter();}, recBottom, recCss: '',
      sheetH: sheetHeight,
    });
    const place = view.place;
    if (place) {
      // Provider detail for this exact place: opening hours, phone and website when the
      // source has them. Call opens Phone with the number filled in where Phone exists;
      // nothing dials until the owner does it there.
      const phone = place.phone, dial = place.phoneHref?.slice('tel:'.length);
      data.pc = {
        name: locationText(place.name), meta: place.origin==='manual'?'Selected location':place.meta, addr: locationText(place.address),
        hasHours: !!place.hours, openTxt: 'Hours', openCss: '', hoursTxt: place.hours || '',
        hasPhone: !!phone, phone: phone || '',
        call: dial && isMvpView('phone') ? () => {if(active())currentApi.open('phone',{prefill:dial});} : undefined,
        copyPhone: phone && !restrictedPlace ? () => {if(active())void copySelectedText(phone).then(()=>currentApi.toast('Number copied'),()=>currentApi.toast('Couldn’t copy',ERROR_TOAST));} : undefined,
        hasWeb: !!place.website, web: () => screen.openWebsite(),
        canDir: place.canDirections && placeSourceVerified, min: 'Directions', saved: place.saved,
        saveLabel: place.saved ? 'Remove from saved' : 'Save', starCss: place.saved ? 'color:var(--acct)' : '', starFill: place.saved ? 'fill:currentColor' : '',
        close: () => {retireSearch();screen.closePlace();}, save: !restrictedPlace || place.saved ? () => screen.toggleSaved() : undefined,
        dirs: placeSourceVerified ? () => {retireSearch();screen.openDirections();const next=screen.view().directions;if(next&&!next.originText.trim()&&mapsController?.snapshot().route.phase!=='ready')screen.locate();} : undefined,
        share: restrictedPlace ? undefined : () => screen.sharePlace(),
        nativeName: place.name, nativeEditing: place.editingName,
        canRename:!restrictedPlace&&(place.saved||place.origin==='manual'),
        nativeEdit: restrictedPlace ? undefined : () => screen.startRename(),
        nativeRename: (event: Event) => screen.rename((event.target as HTMLInputElement).value),
        nativeApplyName: () => screen.applyName(),
      };
    }
    const directions = view.directions;
    if (directions) {
      // Coordinates plan directly; any other text searches places and saved places.
      data.originText=originDraft??locationText(directions.originText||'Your location');
      data.originPlaceholder='My location';
      data.originFocus=(event:FocusEvent)=>{const input=event.target as HTMLInputElement;if(input.value==='My location')input.select();};
      data.onOrigin=(event:Event)=>schedule(true,(event.target as HTMLInputElement).value);
      data.originKey=(event:KeyboardEvent)=>{if(event.key==='Enter'){event.preventDefault();submitOrigin();}};
      data.originLocation=()=>{retireSearch();screen.locate();};
      const nav = view.navigation;
      data.dr={name:locationText(directions.name),close:()=>{retireSearch();screen.back();},min:directions.duration,meta:directions.meta,via:directions.via,shareLabel:'Share route',shareEta:googleMaps ? undefined : () => screen.shareRoute(),
       modes:data.nativeModeMetadata.map((reference:{mode:'drive'|'walk'|'bike'|'transit';label:string;d:string})=>{const mode:TravelMode=reference.mode==='bike'?'bicycle':reference.mode;const on=!!directions.modes.find(choice=>choice.mode===mode)?.selected;return {label:reference.label,t:reference.label,d:reference.d,on,available:!!directions.modes.find(choice=>choice.mode===mode)?.available,css:on?'background:var(--acc);color:#fff':'background:var(--s2);color:var(--fg)',go:()=>{retireSearch();screen.setMode(mode);}};}),
       // The provider's ordered route choice (recommended first); choosing requests nothing.
       hasRoutes:directions.routes.length>0,
       routes:directions.routes.map(choice=>({label:`${choice.label}, ${choice.duration}, ${choice.meta}`,t:choice.label,sub:`${choice.duration} · ${choice.meta}`,on:choice.selected,css:choice.selected?'background:var(--acc);color:#fff':'background:var(--s2);color:var(--fg)',go:()=>{retireSearch();screen.chooseRoute(choice.id);}})),
       hasSteps:directions.steps.length>0,steps:directions.steps.map(step=>({text:step.instruction,distance:step.distance})),
       // Shown on the route sheet and unavailable while a route is planned, so focus stays on it.
       swapShown:!view.navigation,swapOff:!directions.canSwap,swapOpacity:directions.canSwap?1:.4,canSwap:directions.canSwap,swapD:SWAP,swap:()=>{if(!active())return;retireSearch();screen.swapEnds();},
       start:()=>{retireSearch();screen.start();},
       nav:{going:!nav?.arrived,arrived:!!nav?.arrived,dist:nav?.distance||'Locating…',street:nav?.instruction||'Waiting for location',icon:nav?.maneuverIcon||PIN,hasThen:!!nav?.following,thenD:nav?.following?.icon||'',thenText:nav?.following?.text||'',
        left:nav?.remainingTime||'Guidance',meta:nav?.remaining&&nav.remaining===nav.meta?'':nav?.meta||'',remaining:nav?.remaining||'',
        offRoute:!!nav?.offRoute,canReroute:!!nav?.canReroute,reroute:()=>{retireSearch();screen.reroute();},rerouteLabel:'Reroute from here',background:!!nav?.background,
        end:()=>{retireSearch();screen.end();}}};
    }
    const eventOrigin=mapsEventReturnOffered(st.fromEvent,currentApi.S.stack,isNav);
    data.eventReturnFloating=!!eventOrigin&&!!data.showSearch;data.eventReturnInline=!!eventOrigin&&!!data.isDir;
    data.backToEvent=eventOrigin?()=>void returnToEvent(currentApi,eventOrigin,st.fromEvent):undefined;
    data.backToEventTitle=eventOrigin?.title||'';
    data.nativeMapsHandoff=status.mapsAppHandoff;
    data.openInMapsApp=()=>screen.openInMapsApp();
  }
  // The shell instance opens Maps for an agent request, exactly as a user's open would.
  let shell: Bag | undefined;
  // The shell state of an unlocked, visible launcher with no shade, chooser or assistant window over it.
  const idleLauncher=()=>{
    const state=shell?.S?.();
    return !disposed&&!document.hidden&&!!shell?.live&&!!state&&state.screen==='home'&&!state.secure&&!state.shade&&!shell.pageSuspended&&
      !shell.props?.assistantSurface&&!connectionController.getSnapshot().open?state:undefined;
  };
  const notificationOpen=createMapsNotificationOpen({
    ready:()=>Capacitor.isNativePlatform()&&!!idleLauncher(),
    consume:()=>navigationTransport.consumeNavigationOpen(),clear:()=>navigationTransport.clearNavigationOpen(),
    open:()=>shell!.openView('maps',{keepState:true}),
  });
  const renderVals=Component.prototype.renderVals;
  // Later adapters wrap renderVals too, so disposal leaves this wrapper in place as a pass-through.
  Component.prototype.renderVals=function(this: Bag,...args: unknown[]){if(!disposed){shell=this;queueMicrotask(()=>void notificationOpen.flush());}return renderVals.apply(this,args);};
  // The owner's chat request opens Maps over Home or any open app (Phone, Browser) on an unlocked,
  // visible, non-sensitive launcher screen; agent-present.ts names the screens it keeps.
  const surface = screen.surface(async () => {
    const showable=()=>{
      const value=shell?.S?.();
      return !disposed&&!!value&&agentMapsShowable({live:!!shell?.live,hidden:document.hidden,suspended:!!shell?.pageSuspended,
        assistantSurface:!!shell?.props?.assistantSurface,connectionOpen:!!connectionController.getSnapshot().open,
        screen:value.screen,secure:value.secure,shade:value.shade,view:value.view,incomingCall:!!shell?.vget?.('phone')?.incoming});
    };
    if(!showable())return false;
    if(!api?.isActive()){
      shell!.openView('maps');
      await Promise.race([new Promise<void>(resolve=>shell!.setState({},()=>resolve())),new Promise<void>(resolve=>setTimeout(resolve,2000))]);
    }
    return showable()&&shell!.S().view==='maps'&&!!api?.isActive()&&!!surface.snapshot();
  });
  // Agent origin/navigation changes retire the same input ownership as user actions.
  // The shared controller remains product-neutral; these ports own Alpha's debounce.
  const {planFrom:agentPlanFrom,reroute:agentReroute,stop:agentStop}=surface;
  surface.planFrom=origin=>{retireSearch();return agentPlanFrom(origin);};
  surface.reroute=origin=>{retireSearch();return agentReroute(origin);};
  surface.stop=()=>{retireSearch();return agentStop();};
  // Eliza Cloud Maps in the launcher renderer only; never the regional gateway or the assistant window.
  const launcherCloudMaps=()=>!regionalMapsConfigured&&!shell?.props?.assistantSurface&&!document.documentElement.classList.contains('alpha-assistant-surface');
  // Offered to the agent only while Eliza Cloud Maps is installed for the signed-in account.
  const agentNavigation=bindAgentNavigation({
    enabled:launcherCloudMaps,
    installation:()=>{const coverage=cloudMapsCoverage();return coverage&&{providerId:coverage.providerId,attribution:coverage.attribution};},
    connection:mapsConnection,onChange:onMapsConnectionChange,surface,port:residentMapsNavigationPort,
  });
  // Coverage is read once the account is bound and the resident is ready, so the agent can navigate
  // before Maps is opened. A new account gets coverage only; its routes still need a new search.
  const stopSearchConnection=onMapsConnectionChange(()=>{retireSearch();recentSearches=[];});
  const stopCoverage=keepCloudMapsCoverage({
    enabled:launcherCloudMaps,
    ready:()=>!!connectionController.getSnapshot().session,
    account:()=>connectionController.getCloudClient(),
    initialize:readCloudMaps,
    onChange:listener=>connectionController.subscribe(listener),
  });
  // Screen-off navigation keeps its voice; everything else retires shared and spoken output.
  const retireShare=()=>screen.retireShare();
  const shareEvents=['launcher-home','alpha:device-state','alpha:dev-incoming-call'];for(const event of shareEvents)window.addEventListener(event,retireShare);
  const visibility = () => {
    if (document.hidden) {
      retireSearch();
      retireEventReturn();
      screen.hidden();
    } else {screen.refresh();void notificationOpen.flush();}
  };
  const pagehide = () => {
    retireSearch();
    retireEventReturn();
    screen.release();
  };
  const openNavigation=()=>notificationOpen.request();
  const cancelNavigationOpen=()=>notificationOpen.cancel();
  window.addEventListener('launcher-home',cancelNavigationOpen);
  window.addEventListener('alpha:maps-open',openNavigation);
  window.addEventListener('pagehide', pagehide);
  document.addEventListener('visibilitychange', visibility);
  return () => { disposed = true; retireSearch(); stopSearchConnection(); notificationOpen.dispose(); window.removeEventListener('launcher-home',cancelNavigationOpen); retireEventReturn(); stopCoverage(); agentNavigation.dispose(); shell=undefined; for(const event of shareEvents)window.removeEventListener(event,retireShare); screen.dispose(); window.removeEventListener('alpha:maps-open',openNavigation); window.removeEventListener('pagehide', pagehide); document.removeEventListener('visibilitychange', visibility); Object.assign(module, original); };
}

/** Presentation only: stored messages, model context and copied source text remain unchanged.
 * A share answer is an ordinary chat message; the agent still owns the confirmation gate. */
export function installMapsChatAdapter(Component:Bag){
 const p=Component.prototype,render=p.renderVals;
 const answered=new WeakMap<object,Set<string>>();
 const answers=(shell:Bag)=>{let value=answered.get(shell);if(!value){value=new Set();answered.set(shell,value);}return value;};
 async function answer(shell:Bag,id:string,value:string,current:()=>boolean){
  const snapshot=connectionController.getSnapshot(),done=answers(shell);
  if(done.has(id)||!shell.live||document.hidden||snapshot.open||snapshot.busy||shell.S().typing||shell.S().recording||!current())return;
  if(String(shell.S().draft||'').trim()){shell.toast('Chat draft open');return;}
  // send() refuses a prompt while a message edit is open; do not mark the answer as sent.
  if(shell.messageEditTarget){shell.toast('Editing message');return;}
  done.add(id);if(shell.live)shell.setState({});
  try{if(!current()){done.delete(id);return;}await shell.send(value);}catch(error){done.delete(id);if(shell.live){shell.setState({});shell.toast(errorNotice(error,'Not sent'),ERROR_TOAST);}}
 }
 // Each shell keeps the parse of every agent message on screen, keyed by message id. A render
 // parses only new or changed text, and a message that left the conversation is forgotten.
 const parses=new WeakMap<object,Map<string,{source:string;parsed:ReturnType<typeof mapsChatText>}>>();
 p.renderVals=function(){
  const out=render.call(this),msgs=out.msgs||[],done=answers(this);
  const known=parses.get(this),kept:NonNullable<typeof known>=new Map();parses.set(this,kept);
  out.msgs=msgs.map((message:Bag,index:number)=>{
   if(!message.isAgent)return message;
   const source=String(message.displayText??message.text??''),key=String(message.id),hit=known?.get(key);
   const parsed=hit&&hit.source===source?hit.parsed:mapsChatText(source);kept.set(key,{source,parsed});
   if(!parsed.cards.length&&!parsed.choice&&parsed.displayText===source)return message;
   // Only the newest reply can still be answered; an old question is history.
   const choice=parsed.choice,id=choice?String(message.id)+':'+choice.id:'',snapshot=connectionController.getSnapshot(),session=snapshot.session,conversation=connectionController.getSelectedConversationId();
   const saved=this.S().msgs?.find((row:Bag)=>row.id===message.id),savedText=saved?String(saved.displayText??saved.text??''):undefined;
   const current=()=>{const latest=this.S().msgs?.at(-1);return !!session&&connectionController.getSnapshot().session===session&&connectionController.getSelectedConversationId()===conversation&&latest?.id===message.id&&latest.from==='agent'&&String(latest.displayText??latest.text??'')===savedText;};
   const open=!!choice&&index===msgs.length-1&&!done.has(id)&&current();
   return {...message,displayText:parsed.displayText,hasCalendarText:message.hasCalendarText!==false&&!!parsed.displayText,
    messageActionsLabel:message.messageActionsLabel?'Message actions: '+(parsed.displayText||parsed.cards[0]?.title||'Maps'):message.messageActionsLabel,
    mapsCards:parsed.cards.map(card=>({...card,lines:card.lines.map(text=>({text})),hasAttribution:!!card.attribution,canOpenMap:current(),
      openMap:()=>{if(!current()||!this.live||document.hidden||connectionController.getSnapshot().open)return;this.openView('maps',card.route?{agentRoute:card.route}:card.place?{agentPlace:{place:card.place,fromHere:!!card.directionsFromHere,...(card.travelMode?{travelMode:card.travelMode}:{})}}:card.mapQuery?{query:card.mapQuery,nearMe:!!card.nearMe,fromHere:!!card.directionsFromHere,routeMode:card.travelMode??null,searchNear:card.searchNear??null}:{keepState:true});}})),
    hasMapsChoice:open,mapsChoices:open?choice!.options.map(option=>({label:option.label,choose:()=>void answer(this,id,option.value,current)})):[]};
  });return out;
 };
}
