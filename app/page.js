"use client";

import { useRef, useState, useEffect } from "react";
import { SWATCHES } from "./constant";
import axios from "axios";
import Draggable from 'react-draggable';


export default function Home() {
  const canvaRef = useRef(null);
  const ref = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [colour,setColour]=useState("#ffffff");
  const [reset,setReset]=useState(false);
  const [result,setResult]=useState();
  const [dictOfVars, setDictOfVars] = useState({});
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState([]);


  // Setting canvas size
  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
        setTimeout(() => {
            window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
        }, 0);
    }
}, [latexExpression]);

useEffect(() => {
    if (result) {
        renderLatexToCanvas(result.expression, result.answer);
    }
}, [result]);


  useEffect(() => {
    if(reset){
      resetCanva();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvaRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      canvas.width = window.innerWidth; // Set canvas width
      canvas.height = window.innerHeight; // Set canvas height
      ctx.lineCap='round';
      ctx.lineWidth = 3;
    }
    const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: {inlineMath: [['$', '$'], ['\\(', '\\)']]},
            });
        };

        return () => {
            document.head.removeChild(script);
        };
  }, []);


  const renderLatexToCanvas = (expression, answer) => {
    const latex = `\\(\\LARGE{${expression.split(' ').join(' ~ ')} = ${answer}}\\)`;
    setLatexExpression([...latexExpression, latex]);

    // Clear the main canvas
    const canvas = canvaRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
};

  const startDraw = (e) => {
    const canva = canvaRef.current;

    if (canva) {
      const ctx = canva.getContext("2d");
      canva.style.background = "black";
      ctx.beginPath();
      ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      setIsDrawing(true);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canva = canvaRef.current;

    if (canva) {
      const ctx = canva.getContext("2d");
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2; // Set the width of the stroke
      ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    const canva = canvaRef.current;

    if (canva) {
      const ctx = canva.getContext("2d");
      ctx.closePath(); // Close the path when drawing stops
    }
    setIsDrawing(false);
  };

  const resetCanva =()=>{
    const canvas =canvaRef.current;
    if(canvas){
      const ctx =canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0,0,canvas.width,canvas.height);
      }
    }
  }



  const runRoute = async () => {
    const canvas = canvaRef.current;

    if (canvas) {
        try {
            const response = await axios({
                method: 'post',
                url: process.env.NEXT_PUBLIC_URL,
                data: {
                    base64Image: canvas.toDataURL('image/png'),
                    dictOfVarsStr: dictOfVars
                }
            });
            
            const resp = await response.data;

            // Log raw response before parsing
            console.log('Raw Response:', resp.result);

            // Safely parse the result string into a JavaScript object
            let parsedResult = [];
            try {
                parsedResult = JSON.parse(resp.result);
                console.log('Parsed Result:', parsedResult);
            } catch (error) {
                console.error("Failed to parse result:", error);
                return; // Exit if parsing fails
            }

            // Ensure parsedResult is an array and has data
            if (Array.isArray(parsedResult) && parsedResult.length > 0) {
                parsedResult.forEach((data) => {
                    if (data.assign === true) {
                        setDictOfVars(prevDict => ({
                            ...prevDict,
                            [data.expr]: data.result
                        }));
                    }
                });
            } else {
                console.error("Parsed result is not a valid array or is empty:", parsedResult);
            }

            // Process image data only if necessary
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {  // If pixel is not transparent
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            setLatexPosition({ x: centerX, y: centerY });

            // Handle results after a delay
            parsedResult.forEach((data, index) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result
                    });
                }, 1000 * index); // Staggered timeout based on index
            });

        } catch (error) {
            console.error("Error in runRoute:", error);
        }
    }
};



  return (
    <div className="text-white">
      <div className='grid grid-cols-3 gap-2 pt-2'>
          <button
              onClick={() => setReset(true)}
              className='z-20 bg-black text-white'
              variant='default' 
              color='black'
          >
              Reset
          </button>
          <div className='z-20 flex items-center justify-between flex-wrap'>
              {SWATCHES.map((swatch) => (
                  <div className="w-5 h-5 cursor-pointer rounded-full border-2" key={swatch} style={{ backgroundColor: swatch }} onClick={() => setColour(swatch)}></div>
              ))}
          </div>
          <button
              onClick={runRoute}
              className='z-20 bg-black text-white'
              variant='default'
              color='white'
          >
              Run
          </button>
      </div>
      <canvas
        ref={canvaRef}
        id="canvas"
        className="absolute top-0 left-0 h-full w-full"
        onMouseDown={startDraw}
        onMouseOut={stopDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        // Adding touch event listeners for mobile support
        onTouchStart={startDraw}
        onTouchEnd={stopDrawing}
        onTouchMove={draw}
      />
      {latexExpression && latexExpression.map((latex, index) => (
                <Draggable
                nodeRef={ref}
                    key={index}
                    defaultPosition={latexPosition}
                    onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
                >
                    <div ref={ref} className="absolute p-2 text-white rounded shadow-md">
                        <div className="latex-content">{latex}</div>
                    </div>
                </Draggable>
            ))}
    </div>
  );
}
