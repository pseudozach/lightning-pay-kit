// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {LightningPaymentHelp} from '../src/index.js';
import {fakeInvoice} from '../../core/test/fixtures.js';
afterEach(cleanup);
it.each([
 ['default',undefined,['pmdxabka']],['disabled',null,[]],['replaced','host-ref',['host-ref']],
 ['protected',{url:'https://ff.io/?ref=host-ref&ref=shadow&address=shadow&to=XMR&toAmount=5',disclosure:'Host referral'},['host-ref']]
] as const)('prefills amountless FixedFloat in directory, name and token search with %s referrals',(_label,override,refs)=>{
 const now=Date.parse('2026-10-24T00:00:00Z')/1000,invoice=fakeInvoice({createdAt:now,amountHrp:''});
 const writeText=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 render(<LightningPaymentHelp invoice={invoice} now={now} {...(override===undefined?{}:{affiliateOverrides:{fixedfloat:override}})}/>);
 fireEvent.click(screen.getByRole('button',{name:/How can I pay/i}));
 let first='';
 for(const query of ['', 'FixedFloat','USDT Tron']){
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:query}});
  const link=screen.getByRole('link',{name:/FixedFloat/}),url=new URL(link.getAttribute('href')!);
  expect(url.searchParams.get('address')).toBe(invoice);expect(url.searchParams.get('to')).toBe('BTCLN');expect(url.searchParams.get('from')).toBe('USDTTRC');
  expect(url.searchParams.has('toAmount')).toBe(false);expect(url.searchParams.has('fromAmount')).toBe(false);expect(url.searchParams.getAll('ref')).toEqual(refs);
  if(first)expect(url.href).toBe(first);else first=url.href;
  expect(link).toHaveTextContent(/Choose amount (at|with)/i);
  fireEvent.click(link);
 }
 expect(writeText).not.toHaveBeenCalled();
});
