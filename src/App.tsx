/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle2, HelpCircle, Trophy, ChevronLeft, ChevronRight, Search, RotateCcw, Lightbulb, Printer } from 'lucide-react';
import { generateComplexProblem, createProblemFromDivisorAndDividend } from './utils/mathUtils';
import { DivisionProblem } from './types';

interface MaskedCell {
  id: string;
  expected: string;
  value: string;
}

interface PrintProblemData {
  prob: DivisionProblem;
  masks: Record<string, boolean>;
}

export default function App() {
  const [problems, setProblems] = useState<DivisionProblem[]>([]);
  const [maskedCells, setMaskedCells] = useState<Record<string, MaskedCell>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jumpInput, setJumpInput] = useState('1');
  const [problemResults, setProblemResults] = useState<Record<string, { checked: boolean, score: number, isRevealed?: boolean, isAltCorrect?: boolean }>>({});
  const [printData, setPrintData] = useState<PrintProblemData[]>([]);

  const createNewProblems = useCallback(() => {
    const newProblems = Array.from({ length: 100 }, () => generateComplexProblem(3));
    setProblems(newProblems);
    setCurrentIndex(0);
    setJumpInput('1');
    setProblemResults({});
    
    // Generate masks for each problem
    const newMasks: Record<string, MaskedCell> = {};
    newProblems.forEach((prob) => {
      // Mask divisor
      if (Math.random() > 0.7) {
        const id = `${prob.id}-divisor`;
        newMasks[id] = { id, expected: prob.divisor.toString(), value: '' };
      }
      
      // Mask dividend digits
      const divStr = prob.dividend.toString();
      for (let i = 0; i < divStr.length; i++) {
        if (Math.random() > 0.6) {
          const id = `${prob.id}-dividend-${i}`;
          newMasks[id] = { id, expected: divStr[i], value: '' };
        }
      }
      
      // Mask quotient digits
      const quoStr = prob.quotient.toString();
      for (let i = 0; i < quoStr.length; i++) {
        if (Math.random() > 0.5) {
          const id = `${prob.id}-quotient-${i}`;
          newMasks[id] = { id, expected: quoStr[i], value: '' };
        }
      }
      
      // Mask intermediate steps
      prob.steps.forEach((step, sIdx) => {
        if (sIdx > 0) {
          const minStr = step.minuend.toString();
          for (let i = 0; i < minStr.length; i++) {
            if (Math.random() > 0.6) {
              const id = `${prob.id}-step-${sIdx}-min-${i}`;
              newMasks[id] = { id, expected: minStr[i], value: '' };
            }
          }
        }

        const prodStr = step.product.toString();
        for (let i = 0; i < prodStr.length; i++) {
          if (Math.random() > 0.6) {
            const id = `${prob.id}-step-${sIdx}-prod-${i}`;
            newMasks[id] = { id, expected: prodStr[i], value: '' };
          }
        }
      });
      
      // Mask final remainder
      const lastStep = prob.steps[prob.steps.length - 1];
      if (lastStep) {
        const remStr = lastStep.subResult.toString();
        for (let i = 0; i < remStr.length; i++) {
          if (Math.random() > 0.7) {
            const id = `${prob.id}-rem-${i}`;
            newMasks[id] = { id, expected: remStr[i], value: '' };
          }
        }
      }
    });
    setMaskedCells(newMasks);
  }, []);

  useEffect(() => {
    createNewProblems();
  }, [createNewProblems]);

  const handleInputChange = (id: string, val: string) => {
    if (val.length > 1) return; // Only single digits
    if (val !== '' && !/^\d$/.test(val)) return;
    
    setMaskedCells(prev => ({
      ...prev,
      [id]: { ...prev[id], value: val }
    }));
  };

  const checkCurrentAnswer = () => {
    const prob = problems[currentIndex];
    if (!prob) return;

    let correct = 0;
    let total = 0;
    let allFilled = true;
    const userValues: Record<string, string> = {};
    
    (Object.values(maskedCells) as MaskedCell[]).forEach((cell) => {
      if (cell.id.startsWith(`${prob.id}-`)) {
        total++;
        userValues[cell.id] = cell.value;
        if (cell.value === cell.expected) {
          correct++;
        }
        if (cell.value === '') {
          allFilled = false;
        }
      }
    });
    
    let score = total === 0 ? 100 : Math.round((correct / total) * 100);
    let isAltCorrect = false;
    
    if (score < 100 && allFilled) {
      const getVal = (id: string, orig: string) => userValues[id] !== undefined ? userValues[id] : orig;
      
      const userDivisorStr = getVal(`${prob.id}-divisor`, prob.divisor.toString());
      let userDividendStr = '';
      for (let i = 0; i < prob.dividendStr.length; i++) {
        userDividendStr += getVal(`${prob.id}-dividend-${i}`, prob.dividendStr[i]);
      }
      
      const uDivisor = parseInt(userDivisorStr, 10);
      const uDividend = parseInt(userDividendStr, 10);
      
      if (uDivisor > 0 && !isNaN(uDivisor) && !isNaN(uDividend)) {
        const altProb = createProblemFromDivisorAndDividend(uDivisor, uDividend, prob.id);
        let altMatches = true;
        
        if (altProb.quotientStr.length !== prob.quotientStr.length) altMatches = false;
        else {
          for (let i = 0; i < prob.quotientStr.length; i++) {
            if (altProb.quotientStr[i] !== getVal(`${prob.id}-quotient-${i}`, prob.quotientStr[i])) {
              altMatches = false; break;
            }
          }
        }
        
        if (altMatches && altProb.steps.length !== prob.steps.length) altMatches = false;
        else if (altMatches) {
          for (let sIdx = 0; sIdx < prob.steps.length; sIdx++) {
            const altStep = altProb.steps[sIdx];
            const origStep = prob.steps[sIdx];
            
            if (sIdx > 0) {
              const altMinStr = altStep.minuend.toString();
              const origMinStr = origStep.minuend.toString();
              if (altMinStr.length !== origMinStr.length || altStep.minuendColStart !== origStep.minuendColStart) {
                altMatches = false; break;
              }
              for (let i = 0; i < origMinStr.length; i++) {
                if (altMinStr[i] !== getVal(`${prob.id}-step-${sIdx}-min-${i}`, origMinStr[i])) {
                  altMatches = false; break;
                }
              }
              if (!altMatches) break;
            }
            
            const altProdStr = altStep.product.toString();
            const origProdStr = origStep.product.toString();
            if (altProdStr.length !== origProdStr.length || altStep.productColStart !== origStep.productColStart) {
              altMatches = false; break;
            }
            for (let i = 0; i < origProdStr.length; i++) {
              if (altProdStr[i] !== getVal(`${prob.id}-step-${sIdx}-prod-${i}`, origProdStr[i])) {
                altMatches = false; break;
              }
            }
            if (!altMatches) break;
          }
          
          if (altMatches) {
            const altLast = altProb.steps[altProb.steps.length - 1];
            const origLast = prob.steps[prob.steps.length - 1];
            if (!altLast || !origLast) {
              altMatches = false;
            } else {
              const altRemStr = altLast.subResult.toString();
              const origRemStr = origLast.subResult.toString();
              if (altRemStr.length !== origRemStr.length || altLast.subResultColStart !== origLast.subResultColStart) {
                altMatches = false;
              } else {
                for (let i = 0; i < origRemStr.length; i++) {
                  if (altRemStr[i] !== getVal(`${prob.id}-rem-${i}`, origRemStr[i])) {
                    altMatches = false; break;
                  }
                }
              }
            }
          }
        }
        
        if (altMatches) {
          score = 100;
          isAltCorrect = true;
        }
      }
    }

    setProblemResults(prev => ({
      ...prev,
      [prob.id]: { checked: true, score, isAltCorrect }
    }));
  };

  const clearCurrentAnswer = () => {
    const prob = problems[currentIndex];
    if (!prob) return;

    setMaskedCells(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${prob.id}-`)) {
          next[key] = { ...next[key], value: '' };
        }
      });
      return next;
    });

    setProblemResults(prev => {
      const next = { ...prev };
      delete next[prob.id];
      return next;
    });
  };

  const showCurrentAnswer = () => {
    const prob = problems[currentIndex];
    if (!prob) return;

    setMaskedCells(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${prob.id}-`)) {
          next[key] = { ...next[key], value: next[key].expected };
        }
      });
      return next;
    });

    setProblemResults(prev => ({
      ...prev,
      [prob.id]: { checked: true, score: 0, isRevealed: true }
    }));
  };

  const handlePrintWorksheet = () => {
    const data: PrintProblemData[] = [];
    for (let i = 0; i < 36; i++) {
      const prob = generateComplexProblem(3);
      
      const masks: Record<string, boolean> = {};
      
      // Mask quotient
      for (let j = 0; j < prob.quotientStr.length; j++) {
        if (Math.random() > 0.4) masks[`q-${j}`] = true;
      }
      // Mask divisor
      const divStr = prob.divisor.toString();
      for (let j = 0; j < divStr.length; j++) {
        if (Math.random() > 0.7) masks[`div-${j}`] = true;
      }
      // Mask dividend
      const didStr = prob.dividendStr;
      for (let j = 0; j < didStr.length; j++) {
        if (Math.random() > 0.6) masks[`did-${j}`] = true;
      }
      // Mask steps
      prob.steps.forEach((step, sIdx) => {
        if (sIdx > 0) {
          const minStr = step.minuend.toString();
          for (let j = 0; j < minStr.length; j++) {
            if (Math.random() > 0.6) masks[`step-${sIdx}-min-${j}`] = true;
          }
        }
        const prodStr = step.product.toString();
        for (let j = 0; j < prodStr.length; j++) {
          if (Math.random() > 0.6) masks[`step-${sIdx}-prod-${j}`] = true;
        }
      });
      // Mask remainder
      const lastStep = prob.steps[prob.steps.length - 1];
      if (lastStep) {
        const remStr = lastStep.subResult.toString();
        for (let j = 0; j < remStr.length; j++) {
          if (Math.random() > 0.7) masks[`rem-${j}`] = true;
        }
      }
      
      data.push({ prob, masks });
    }
    setPrintData(data);
    
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setJumpInput(String(currentIndex));
    }
  };

  const goToNext = () => {
    if (currentIndex < problems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setJumpInput(String(currentIndex + 2));
    }
  };

  const handleJump = () => {
    const num = parseInt(jumpInput);
    if (!isNaN(num) && num >= 1 && num <= problems.length) {
      setCurrentIndex(num - 1);
    } else {
      setJumpInput(String(currentIndex + 1));
    }
  };

  const renderDigit = (probId: string, id: string, defaultValue: string, className: string = "") => {
    const masked = maskedCells[id];
    const isChecked = problemResults[probId]?.checked;
    const isAltCorrect = problemResults[probId]?.isAltCorrect;

    if (masked) {
      const isCorrect = isChecked && (masked.value === masked.expected || isAltCorrect);
      const isWrong = isChecked && !isCorrect;
      
      return (
        <input
          type="text"
          value={masked.value}
          onChange={(e) => handleInputChange(id, e.target.value)}
          disabled={isChecked}
          className={`w-10 h-12 text-center border-2 rounded-md font-bold text-2xl transition-all outline-none
            ${isCorrect ? 'border-green-500 bg-green-50 text-green-700' : 
              isWrong ? 'border-red-500 bg-red-50 text-red-700' : 
              'border-gray-300 focus:border-blue-500 bg-white'}`}
        />
      );
    }
    return (
      <div className={`w-10 h-12 flex items-center justify-center font-bold text-2xl ${className}`}>
        {defaultValue}
      </div>
    );
  };

  const prob = problems[currentIndex];

  return (
    <>
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans print:hidden">
        <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold text-slate-900 mb-2 flex items-center justify-center gap-3"
          >
            <HelpCircle className="text-blue-600 w-10 h-10" />
            小学竖式除法填空
          </motion.h1>
          <p className="text-slate-600 text-lg">观察竖式，填入缺失的数字，完成除法运算。</p>
        </header>

        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 gap-4">
          <button 
            onClick={goToPrevious} 
            disabled={currentIndex === 0}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${currentIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            <ChevronLeft className="w-5 h-5" /> 上一题
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">第</span>
            <input 
              type="number" 
              value={jumpInput} 
              onChange={e => setJumpInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJump()}
              onBlur={handleJump}
              className="w-16 text-center border-2 border-slate-200 rounded-lg py-1 focus:border-blue-500 outline-none font-bold text-slate-700"
              min={1}
              max={problems.length}
            />
            <span className="text-slate-600 font-medium">题 / 共 {problems.length} 题</span>
            <button 
              onClick={handleJump}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="跳转"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={goToNext} 
            disabled={currentIndex === problems.length - 1}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${currentIndex === problems.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            下一题 <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-8 min-h-[400px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {prob && (
              <motion.div
                key={prob.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center overflow-x-auto w-full max-w-2xl"
              >
                {(() => {
                  const dividendLen = prob.dividendStr.length;
                  const quotientLen = prob.quotientStr.length;
                  const offset = dividendLen - quotientLen;

                  return (
                    <div className="inline-grid gap-0" style={{ gridTemplateColumns: `auto repeat(${dividendLen}, 2.5rem)` }}>
                      {/* Quotient Row */}
                      <div className="h-12"></div> {/* Empty cell for divisor column */}
                      {Array.from({ length: dividendLen }).map((_, i) => {
                        const qIdx = i - offset;
                        return (
                          <div key={i} className="w-10 h-12 flex items-center justify-center">
                            {qIdx >= 0 && renderDigit(prob.id, `${prob.id}-quotient-${qIdx}`, prob.quotientStr[qIdx])}
                          </div>
                        );
                      })}

                      {/* Dividend Row */}
                      <div className="h-12 flex items-center justify-end pr-3 border-r-2 border-slate-800">
                        {renderDigit(prob.id, `${prob.id}-divisor`, prob.divisor.toString())}
                      </div>
                      {prob.dividendStr.split('').map((d, i) => (
                        <div key={i} className="w-10 h-12 border-t-2 border-slate-800 flex items-center justify-center">
                          {renderDigit(prob.id, `${prob.id}-dividend-${i}`, d)}
                        </div>
                      ))}

                      {/* Steps */}
                      {prob.steps.map((step, sIdx) => {
                        const prodStr = step.product.toString();
                        const minStr = step.minuend.toString();
                        
                        return (
                          <React.Fragment key={sIdx}>
                            {/* Minuend Row (only if sIdx > 0) */}
                            {sIdx > 0 && (
                              <>
                                <div className="h-12"></div>
                                {Array.from({ length: dividendLen }).map((_, i) => (
                                  <div key={i} className="w-10 h-12 flex items-center justify-center">
                                    {i >= step.minuendColStart && i <= step.minuendColEnd &&
                                      renderDigit(prob.id, `${prob.id}-step-${sIdx}-min-${i - step.minuendColStart}`, minStr[i - step.minuendColStart])}
                                  </div>
                                ))}
                              </>
                            )}

                            {/* Product Row */}
                            <div className="h-12"></div>
                            {Array.from({ length: dividendLen }).map((_, i) => (
                              <div key={i} className={`w-10 h-12 flex items-center justify-center ${i >= step.productColStart && i <= step.productColEnd ? 'border-b-2 border-slate-800' : ''}`}>
                                {i >= step.productColStart && i <= step.productColEnd && 
                                  renderDigit(prob.id, `${prob.id}-step-${sIdx}-prod-${i - step.productColStart}`, prodStr[i - step.productColStart])}
                              </div>
                            ))}
                          </React.Fragment>
                        );
                      })}
                      
                      {/* Final Remainder Row */}
                      {(() => {
                        const lastStep = prob.steps[prob.steps.length - 1];
                        if (!lastStep) return null;
                        const remStr = lastStep.subResult.toString();
                        return (
                          <>
                            <div className="h-12"></div>
                            {Array.from({ length: dividendLen }).map((_, i) => (
                              <div key={i} className="w-10 h-12 flex items-center justify-center">
                                {i >= lastStep.subResultColStart && i <= lastStep.subResultColEnd &&
                                  renderDigit(prob.id, `${prob.id}-rem-${i - lastStep.subResultColStart}`, remStr[i - lastStep.subResultColStart])}
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-6">
          {prob && problemResults[prob.id]?.checked && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center bg-blue-50 p-6 rounded-2xl border border-blue-100 w-full max-w-md"
            >
              {problemResults[prob.id].isRevealed ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <Lightbulb className="text-yellow-500 w-8 h-8" />
                    <span className="text-2xl font-bold text-blue-900">已显示答案</span>
                  </div>
                  <p className="text-blue-700 font-medium">
                    这是正确答案，请仔细观察学习哦！
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="text-yellow-500 w-8 h-8" />
                    <span className="text-2xl font-bold text-blue-900">得分: {problemResults[prob.id].score}%</span>
                  </div>
                  <p className="text-blue-700 font-medium">
                    {problemResults[prob.id].score === 100 ? "太棒了！全部正确！" : problemResults[prob.id].score >= 60 ? "做得不错，继续加油！" : "别灰心，再检查一下吧！"}
                  </p>
                </>
              )}
            </motion.div>
          )}

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={checkCurrentAnswer}
              disabled={prob && problemResults[prob.id]?.checked}
              className={`flex items-center gap-2 px-8 py-3 font-bold rounded-xl shadow-lg transition-all transform active:scale-95
                ${prob && problemResults[prob.id]?.checked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              <CheckCircle2 className="w-5 h-5" />
              检查答案
            </button>
            <button
              onClick={showCurrentAnswer}
              disabled={prob && problemResults[prob.id]?.checked && problemResults[prob.id]?.isRevealed}
              className={`flex items-center gap-2 px-6 py-3 bg-white font-semibold rounded-xl border-2 transition-all shadow-sm
                ${prob && problemResults[prob.id]?.checked && problemResults[prob.id]?.isRevealed ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200 text-slate-700 hover:border-yellow-500 hover:text-yellow-600'}`}
            >
              <Lightbulb className="w-5 h-5" />
              给出答案
            </button>
            <button
              onClick={clearCurrentAnswer}
              className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-200 hover:border-red-500 hover:text-red-600 transition-all shadow-sm"
            >
              <RotateCcw className="w-5 h-5" />
              清除答案
            </button>
            <button
              onClick={handlePrintWorksheet}
              className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-200 hover:border-purple-500 hover:text-purple-600 transition-all shadow-sm"
            >
              <Printer className="w-5 h-5" />
              打印试卷
            </button>
            <button
              onClick={createNewProblems}
              className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
            >
              <RefreshCw className="w-5 h-5" />
              更新题库
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-20 text-center text-slate-400 text-sm flex flex-col gap-1">
        <p>© 2026 小学数学练习助手 | 竖式除法专项练习</p>
        <p>作者: OwenLiu04 | 版本: v1.0.0</p>
        <p>反馈邮箱: <a href="mailto:lf19902001@qq.com" className="hover:text-blue-500 transition-colors">lf19902001@qq.com</a></p>
      </footer>
    </div>

    {/* Print View */}
    <div className="hidden print:block w-full bg-white text-black p-4">
      <h1 className="text-2xl font-bold text-center mb-8">竖式除法填空练习</h1>
      <div className="grid grid-cols-2 gap-y-12 gap-x-6">
        {printData.map((data, index) => {
          const { prob, masks } = data;
          const dividendLen = prob.dividendStr.length;
          const divisorLen = prob.divisor.toString().length;
          
          const renderPrintDigit = (key: string, char: string) => {
            const isMasked = masks[key];
            if (isMasked) {
              return <div key={key} className="w-6 h-8 border-[1px] border-gray-500 rounded-sm"></div>;
            }
            return <div key={key} className="w-6 h-8 flex items-center justify-center text-lg font-bold text-black">{char}</div>;
          };

          return (
            <div key={index} className="break-inside-avoid flex flex-col items-center">
              <div className="text-base font-bold mb-3 w-full pl-6">题目 {index + 1}</div>
              <div className="font-mono flex flex-col items-end">
                
                {/* Quotient Row */}
                <div className="flex">
                  <div style={{ width: `${(divisorLen * 1.5) + 0.25}rem` }}></div>
                  {Array.from({ length: dividendLen }).map((_, i) => (
                    <div key={i} className="w-6 h-8 flex items-center justify-center">
                      {i >= dividendLen - prob.quotientStr.length && 
                        renderPrintDigit(`q-${i - (dividendLen - prob.quotientStr.length)}`, prob.quotientStr[i - (dividendLen - prob.quotientStr.length)])}
                    </div>
                  ))}
                </div>

                {/* Divisor and Dividend Row */}
                <div className="flex mt-1">
                  {/* Divisor */}
                  <div className="flex mr-1">
                    {Array.from({ length: divisorLen }).map((_, i) => (
                      <div key={i} className="w-6 h-8 flex items-center justify-center">
                        {renderPrintDigit(`div-${i}`, prob.divisor.toString()[i])}
                      </div>
                    ))}
                  </div>
                  
                  {/* Dividend */}
                  <div className="flex relative">
                    <div className="absolute inset-0 border-l-[1.5px] border-t-[1.5px] border-black rounded-tl-md pointer-events-none -ml-1 -mt-0.5" style={{ width: `calc(100% + 0.125rem)`, height: `calc(100% + 0.125rem)` }}></div>
                    {Array.from({ length: dividendLen }).map((_, i) => (
                      <div key={i} className="w-6 h-8 flex items-center justify-center">
                        {renderPrintDigit(`did-${i}`, prob.dividendStr[i])}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                {prob.steps.map((step, sIdx) => {
                  const prodStr = step.product.toString();
                  const minStr = step.minuend.toString();
                  
                  return (
                    <React.Fragment key={sIdx}>
                      {/* Minuend Row */}
                      {sIdx > 0 && (
                        <div className="flex mt-1">
                          {Array.from({ length: dividendLen }).map((_, i) => (
                            <div key={i} className="w-6 h-8 flex items-center justify-center">
                              {i >= step.minuendColStart && i <= step.minuendColEnd &&
                                renderPrintDigit(`step-${sIdx}-min-${i - step.minuendColStart}`, minStr[i - step.minuendColStart])}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Product Row */}
                      <div className="flex mt-1">
                        {Array.from({ length: dividendLen }).map((_, i) => (
                          <div key={i} className={`w-6 h-8 flex items-center justify-center ${i >= step.productColStart && i <= step.productColEnd ? 'border-b-[1.5px] border-black' : ''}`}>
                            {i >= step.productColStart && i <= step.productColEnd && 
                              renderPrintDigit(`step-${sIdx}-prod-${i - step.productColStart}`, prodStr[i - step.productColStart])}
                          </div>
                        ))}
                      </div>
                    </React.Fragment>
                  );
                })}
                
                {/* Final Remainder */}
                {(() => {
                  const lastStep = prob.steps[prob.steps.length - 1];
                  if (!lastStep) return null;
                  const remStr = lastStep.subResult.toString();
                  return (
                    <div className="flex mt-1">
                      {Array.from({ length: dividendLen }).map((_, i) => (
                        <div key={i} className="w-6 h-8 flex items-center justify-center">
                          {i >= lastStep.subResultColStart && i <= lastStep.subResultColEnd &&
                            renderPrintDigit(`rem-${i - lastStep.subResultColStart}`, remStr[i - lastStep.subResultColStart])}
                        </div>
                      ))}
                    </div>
                  );
                })()}

              </div>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
