import { useState, useEffect } from "react";
const usePopUpStyle = (selectRef, className, groupRef) => {
    const [popupStyle, setPopupStyle] = useState({});
    const [open, onOpen] = useState(false)
    const setOpen = (open) => {
        onOpen(open)
    }
    const updatePopupPosition = () => {
        if (selectRef.current) {
            const {inIframe} = window.DOSM_CUSTOM_DBS.signoff
            // 获取 iframe 在父页面中的位置
            const iframeRect = inIframe ? window.frameElement.getBoundingClientRect() : {top: 0, left: 0}

            // 获取 Select 触发节点在 iframe 内的位置
            const triggerRect = selectRef.current.getBoundingClientRect();

            // 父窗口的可视区域高度
            const parentWindowHeight = window.parent.innerHeight;

            // 计算弹窗在父页面中的位置
            let top = iframeRect.top + triggerRect.bottom;
            let left = iframeRect.left + triggerRect.left;
            const popupHeight = window.parent.document.querySelector(`.${className}`)?.offsetHeight
            if ((top + popupHeight) > (parentWindowHeight - 20)) {
                top = top - 30 - popupHeight
            }
            return {
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                zIndex: 1051
            }
        }
    };
    const setStyle = (timer) => {
        const dropDownEls = window.parent.document.querySelectorAll(`.${className}`)
        const dropDownEl = dropDownEls[dropDownEls.length - 1]
        if(dropDownEl){
            const style = updatePopupPosition();
            dropDownEl.style.top = style.top
            dropDownEl.style.left = style.left
            setTimeout(() => {
                timer && clearInterval(timer)
            },1000)
        }
    }
    const observerCallback = (mutationsList, observer) => {
        for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                console.log('node', node)
                if (node.nodeType === Node.ELEMENT_NODE && node.querySelector(`.${className}`)) {
                    node.querySelector(`.${className}`).style.visibility = 'hidden'
                    setTimeout(() => {
                        node.querySelector(`.${className}`).style.visibility = 'visible'
                    },100)
                    observer.disconnect();
                }
            });
        }
        }
    };
  
    useEffect(() => {
        // 初次渲染时计算位置
        // const style = updatePopupPosition();
        // setPopupStyle(style)
        // 父窗口滚动时重新计算位置
        window.parent.addEventListener('scroll', setStyle);
        return () => {
            window.parent.removeEventListener('scroll', setStyle);
        };
    }, [selectRef.current]);
    useEffect(() => {
        if(!open) {
            setTimeout(() => {
                const dropDownEls = window.parent.document.querySelectorAll(`.${className}`)
                const dropDownEl = dropDownEls[dropDownEls.length - 1]
                if(dropDownEl){
                    dropDownEl.classList.add('ant-select-dropdown-hidden')
                    dropDownEl.classList.remove('slide-up-leave')
                    dropDownEl.classList.remove('slide-up-leave-active')
                    dropDownEl.classList.remove('slide-up')
                }
            },300)
            return
        }
        const timer = setInterval(() => {
            setStyle(timer)
        },10)
    },[open])
    useEffect(() => {
        window.parent.document.addEventListener('click',() => {
            if(open){
                const dropDownEls = window.parent.document.querySelectorAll(`.${className}`)
                const dropDownEl = dropDownEls[dropDownEls.length - 1]
                if(dropDownEl){
                    dropDownEl.classList.add('ant-select-dropdown-hidden')
                }
                setOpen(false)
                groupRef?.current?.setVisible?.(false)
            }
        })
        return () => {
            window.parent.document.removeEventListener('click',() => {
                const dropDownEls = window.parent.document.querySelectorAll(`.${className}`)
                const dropDownEl = dropDownEls[dropDownEls.length - 1]
                if(dropDownEl){
                    dropDownEl.classList.add('ant-select-dropdown-hidden')
                }
            })
        }
    },[open])
    useEffect(() => {
        window.addEventListener('unload', (event) => {
            const dropDownEls = window.parent.document.querySelectorAll(`.${className}`)
            const dropDownEl = dropDownEls[dropDownEls.length - 1]
            if(dropDownEl){
                dropDownEl?.parentElement?.parentElement?.remove()
            }
            setOpen(false)
            groupRef?.current?.setVisible?.(false)
        });
        const observer = new MutationObserver(observerCallback);
        observer.observe(window.parent.document.body, {
            childList: true,
            subtree: true
        });
        return () => {
            observer.disconnect();
        }
    },[])
    return {
        popupStyle,
        open,
        setOpen
    }
}
export default usePopUpStyle