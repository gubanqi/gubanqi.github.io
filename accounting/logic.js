(function(root){
  function grade(question, choices){
    if (!Array.isArray(question.correct) || !question.correct.length) return null;
    const actual=[...new Set(choices)].sort((a,b)=>a-b);
    const expected=[...question.correct].sort((a,b)=>a-b);
    return actual.length===expected.length && actual.every((v,i)=>v===expected[i]);
  }
  function stats(questions, records){
    const s={total:questions.length,attempted:0,independent:0,seen:0,wrong:0,self:0};
    for(const q of questions){const r=records[q.id]||{};const a=r.firstAttempt;if(a){s.attempted++;if(a.method==='auto'&&a.correct&&!a.seenBeforeSubmit)s.independent++;if(a.method==='self'&&a.correct!==null)s.self++;}if(r.seen)s.seen++;if(r.needsReview===true||(r.needsReview===undefined&&r.submitted&&r.currentCorrect===false))s.wrong++;}
    return s;
  }
  const api={grade,stats};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudyLogic=api;
})(globalThis);
