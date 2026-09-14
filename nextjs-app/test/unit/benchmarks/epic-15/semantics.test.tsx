import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe,it,expect,vi } from 'vitest';
import { render,cleanup } from '@testing-library/react';
import { VenuePin } from '@/components/custom/map/VenuePin';
import { isVenuePubliclySunny } from '@/lib/utils/public-sun';
import mapCopy from '@/messages/sv/map.json';
import venueCopy from '@/messages/sv/venue.json';
import type { VenuePinData } from '@/lib/types/map';
import {publishLane,semanticCells,semanticSources,artifactHashes} from '../../../../scripts/benchmarks/epic-15/evidence.mjs';
vi.mock('@/hooks/use-reduced-motion',()=>({useReducedMotion:()=>true}));
describe('M04 unchanged presentation under experimental low-angle values',()=>{
  it('captures real pin rendering with current Swedish ARIA templates for known/unknown weather',()=>{
    const rows=[];
    let attempts=0;
    const originalFetch=globalThis.fetch;
    globalThis.fetch=async()=>{attempts++;throw Error('Offline semantic evidence');};
    try {
    for(const percent of [25,0,100])for(const state of ['likely','blocked','unknown'] as const) {
      const venue:VenuePinData={id:'synthetic',slug:'synthetic',name:'Mätplats',lat:57.7089,lng:11.9746,sunStatus:'NoSun',sunExposurePercent:percent,directSunState:state,weatherGateState:state==='likely'?'not_gated':state==='blocked'?'gated':'unknown',isPartner:false};
      // Same branch order as VenuePinLayer: templates are source-derived, not a layer integration assertion.
      const template=state==='unknown'?mapCopy.pinUnknownAria:isVenuePubliclySunny(venue)?mapCopy.pinSunnyAria:mapCopy.pinNotSunnyAria;
      const aria=template.replace('{name}',venue.name).replace('{percent}',String(percent));
      const rendered=render(<VenuePin venue={venue} ariaLabel={aria} isSelected={false} onClick={()=>{}}/>);
      const pin=rendered.getByTestId('venue-pin');
      expect(pin.getAttribute('data-pin-state')).toBe(percent>50&&state==='likely'?'sunny':'shaded');
      expect(pin.getAttribute('aria-label')).toBe(aria);
      rows.push({percent,state,aria,visibleText:pin.textContent,icon:pin.querySelector('[data-pin-icon]')?.getAttribute('data-pin-icon'),
        currentDetailCopyExample:state==='unknown'?venueCopy.quickInfo.clearSkyPotential.replace('{percent}',String(percent)):venueCopy.quickInfo.notSunnyVerdict,
        scope:'Pin rendered; detail copy is source excerpt, NOT rendered detail evidence',html:pin.outerHTML});
      cleanup();
    }
    expect(attempts).toBe(0);
    expect(rows).toHaveLength(9);
    if(process.env.E15_OUTPUT){
      const out=process.env.E15_OUTPUT;
      if(!path.isAbsolute(out))throw Error('Absolute E15_OUTPUT required');
      fs.mkdirSync(out,{recursive:true});
      fs.writeFileSync(path.join(out,'M04-pin-semantics.json'),JSON.stringify({rows,sourceHashes:artifactHashes(process.cwd(),semanticSources),ownerAcceptance:'PENDING',risk:'0–5 degrees means model unsupported, not physically absent direct beam. Existing known-negative ARIA and 0% building-shadow potential copy need owner review.'},null,2),{flag:'wx'});
      publishLane(out,'semantics-completion.json',{complete:true,offlineAttempts:attempts,cells:rows.map(r=>`${r.percent}/${r.state}`)},['M04-pin-semantics.json'],semanticCells);
    }
    }finally{globalThis.fetch=originalFetch;cleanup();}
  });
});
