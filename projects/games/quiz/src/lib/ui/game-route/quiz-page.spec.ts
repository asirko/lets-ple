import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QuizPage } from './quiz-page';
import { QuizStore } from '../../store/quiz.store';
import type { Country } from '../../domain/types';
const countries:Country[]=Array.from({length:12},(_,i)=>({iso2:'A'+String.fromCharCode(65+i),iso3:'AA'+String.fromCharCode(65+i),name:'Pays '+i,aliases:[],capitals:['Ville '+i],capitalAliases:{},continent:'Europe',subregion:'Western Europe',borders:['AA'+String.fromCharCode(65+(i+1)%12),'AA'+String.fromCharCode(65+(i+11)%12)],flag:'content/geography/flags/01234567890123456789.svg',flagEligible:true,capitalEligible:true,geometry:{type:'Polygon',coordinates:[[[i,0],[i+1,0],[i+1,1],[i,1],[i,0]]]}}));
describe('quiz page correction flow',()=>{
 beforeEach(()=>{
  TestBed.configureTestingModule({providers:[provideRouter([])]});
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>countries})));
  HTMLDialogElement.prototype.showModal ??= function(){this.setAttribute('open','');};
  HTMLDialogElement.prototype.close ??= function(){this.removeAttribute('open');this.dispatchEvent(new Event('close'));};
 });
 afterEach(()=>vi.unstubAllGlobals());
 it('ne revele rien avant soumission puis corrige le pays des cinq categories et termine',async()=>{
  const f=TestBed.createComponent(QuizPage);f.detectChanges();await f.whenStable();f.detectChanges();
  const store=f.debugElement.injector.get(QuizStore);await vi.waitFor(()=>{f.detectChanges();expect(store.question()).not.toBeNull();});const categories=new Set<string>();
  for(let i=0;i<10;i++){
   const q=store.question()!;categories.add(q.type);
   expect(f.nativeElement.querySelector('lp-quiz-correction')).toBeNull();
   expect(f.nativeElement.querySelector('lp-country-globe')).toBeNull();
   for(const media of f.nativeElement.querySelectorAll('.quiz-silhouette,.quiz-flag'))expect(media.getAttribute('aria-label')||media.getAttribute('alt')).not.toContain(countries.find(c=>c.iso3===q.countryCode)!.name);
   store.dispatch({type:'mode',mode:'carre'});f.detectChanges();
   const answer=store.state()!.options.find(a=>!q.correctAnswers.includes(a.id))!;
   store.dispatch({type:'answer',value:answer.id});f.detectChanges();
   const correction=f.nativeElement.querySelector('lp-quiz-correction');expect(correction).not.toBeNull();
   expect(correction?.textContent).toContain(countries.find(c=>c.iso3===q.countryCode)!.name);
   const button=correction?.querySelector('.dialog-actions button');expect(button?.textContent).toContain(i===9?'Voir le résultat':'Question suivante');
   button?.click();f.detectChanges();await f.whenStable();f.detectChanges();
  }
  expect(categories.size).toBe(5);expect(store.state()?.phase).toBe('finished');expect(f.nativeElement.querySelector('lp-quiz-result')).not.toBeNull();
 });
});
