import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import TestingSignoff from './TestingSignoff';
import HeightenSignoff from './HeightenSignoff';
import ProjectCutoverSignoff from './ProjectCutoverSignoff';
import OtherSignoff from './OtherSignoff';
import OptionalArtefacts from './OptionalArtefacts'
import IDRSignoff from './IDRSignoff'
// eslint-disable-next-line import/no-anonymous-default-export
export default ({ moduleType, ...rest }) => {
    const containerRef = useRef(null);
    const { type = 'testing' } = useParams();

    const SignoffComponent = {
        testing: TestingSignoff,
        heighten: HeightenSignoff,
        projectCutover: ProjectCutoverSignoff,
        other: OtherSignoff,
        optional: OptionalArtefacts,
        idr: IDRSignoff,
    }[moduleType ?? type] || TestingSignoff;

    const signoffTitles = {
        testing: 'Testing Signoff',
        projectCutover: 'Project Cutover Signoff',
        other: 'Other Signoff',
        heighten: 'Heighten Signoff',
        optional: 'Optional Artefacts',
        idr: 'Project Cutvoer -IDR Signoff'
    };

    useEffect(() => {
        if (containerRef.current) {
            window.parent.postMessage({
                eventType: 'onChildFormInit',
            }, '*');
        }
        if (process.env.NODE_ENV === 'development') {
            localStorage.setItem('dosm_loginInfo', '{"rbac":["DOSM-RLLBSTSZ-IN","DOSM-JDGZSZ-OUT","DOSM-JDGL-OUT","DOSM-JDGZSZ-IN","DOSM-JDGL-IN","MyWiseBot","Session Logs","addKB","DOSM-JQGL-IN","DOSM-JQGL-OUT","DOSM-JCZX-IN","DOSM-XTJCGL-IN","DOSM-XTJCGL-OUT","DOSM-JCZX-OUT","DOSM-PBGL","commonTrashBin","DOSM-SYGD","DOSM-GGGL","DOSM-DCGDXQ","DOSM-YWSZ","DOSM-FWMLGL-OUT","DOSM-DYFWML-OUT","dosm_change_calendar","dosm_channel_management","DOSM-JSC","DOSM-ZJSZMENU-IN"," DOSM-ZJSZML-IN","DOSM-GZT-VIEW-TYPE","DOSM-ZBGL","DOSM-DCLBXQ","DOSM-DCPDF","DOSM-SJQX","DOSM-SJBJB","DOSM-GRJDMBSZ-IN","DOSM-SJBMX","DOSM-DTBDCL","DOSM-WBSJY","DOSM-BDST","dosm_knowledge_management","DOSM-ZJSZML-OUT","DOSM-ZJSZMENU-OUT","DOSM-GZGL-OUT","DOSM-WTSZ-OUT","DOSM-LXGZ-OUT","DOSM-YYSZ-OUT","DOSM-FWSJSZ-OUT","DOSM-WDZB","DOSM-TZGL","DOSM-TZGZ","DOSM-FWMLGL-IN","DOSM-DYFWML-IN","DOSM-CKGD","DOSM-LCPZ-IN","DOSM-ANGL-IN","DOSM-SJZD-IN","DOSM-KZSZ-IN","DOSM-GGZDGL-IN","DOSM-LCGL-IN","DOSM-LCJSGL-IN","DOSM-SLAOLA-IN","DOSM-ZDYYQ-IN","DOSM-SCGD","DOSM-JSSZ","DOSM-GZGL-IN","DOSM-WTSZ-IN","DOSM-LXGZ-IN","DOSM-FWML","dosm_service_attend","dosm_service_counter","dosm_service_monitor","dosm_service_multipleLevels","dosm_service_session","dosm_service_setting","dosm_service_statistics","DOSM-YYSZ-IN","DOSM-FWSJSZ-IN","DOSM-LCPZ-OUT","DOSM-ANGL-OUT","DOSM-SJZD-OUT","DOSM-KZSZ-OUT","DOSM-GGZDGL-OUT","DOSM-LCGL-OUT","DOSM-LCJSGL-OUT","DOSM-SLAOLA-OUT","DOSM-ZDYYQ-OUT","dosm_smart_assistant","dosm_smart_robot","DOSM-XTSZ","DOSM-MBGL","DOSM-STSZ-IN","DOSM-GZTSTSZ-IN","DOSM-GZTSTSZ-OUT","DOSM-STSZ-OUT","DOSM-GDLBSTSZ-IN","DOSM-GDLBSTSZ-OUT","DOSM-WORKORDER","DOSM-GDGL","DOSM-ZBQK","DOSM-BCGL","DOSM-ZBSP","entity_management","kbManager","knowledgeConsole","knowledgeSearch","lexicon","management","DOSM-MRSTBJ","DOSM-GRSZ-IN","DOSM-GRSTSZ-IN","myArticles","myCollection","myReviews","myTrashBin","process_management","questions","sensitive","session","statistics","sync","terms","testing","training","trashBin","DOSM-CHANGE-CALENDAR-TYPE","douc_center_quota","douc_center_sub_tenant","DOSM-CJK"],"expireIn":"300000","user":{"accountId":"110","userId":"2","name":"Admin","userAlias":"Admin","departmentId":"1","departmentLevel":"0","department":"云智慧集团","email":"","mobile":"","status":"1","extend":[],"sysAdminFlag":true}}')
        }    
    }, []);
    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            const height = containerRef.current.scrollHeight
            window.parent.postMessage({
                eventType: 'setChildPageHeight',
                height
            }, '*');
        });
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => {
            resizeObserver.disconnect();
        };
    },[containerRef])
    return (
        <div className="signoff" ref={containerRef}>
            {/* <h2>{signoffTitles[type] || signoffTitles.testing}</h2> */}
            <SignoffComponent 
                {...rest}
            />
            <style jsx>{`
                .signoff{
                    background: #fff;
                    h2{
                        height: 44px;
                        font-size: 16px;
                        font-weight: bold;
                        // background: #f9f9f9;
                        padding-left: 8px;
                        line-height: 44px;
                        margin-bottom: 10px;
                    }
                    :global(td){
                        overflow: visible;
                        vertical-align: top;
                        :global(.ant-select){
                            width: 100%;
                        }
                    }
                    :global(.dosm-dbs-form-item-has-error){
                        margin-bottom: 0;
                    }
                }
            `}</style>
        </div>
    );
}