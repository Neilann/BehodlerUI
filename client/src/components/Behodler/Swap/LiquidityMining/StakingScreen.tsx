import * as React from 'react'
import { useEffect, useState, useContext, useCallback } from 'react'
import Token from '../../../../blockchain/observables/Token'
import { Button, createStyles, Link, Grid, makeStyles, withStyles, Theme } from '@material-ui/core'
import { lightGreen, purple } from '@material-ui/core/colors';
import uniswap from "../../../../images/behodler/uniswap.png"
import unigrey from "../../../../images/behodler/uniswap_grey.png"

import API from "../../../../blockchain/ethereumAPI"
import { WalletContext } from "../../../Contexts/WalletStatusContext"
import { formatSignificantDecimalPlaces } from 'src/util/jsHelpers'
import BigNumber from 'bignumber.js';


const useStakeStyles = makeStyles(theme => createStyles({
    poolLink: {
        fontWeight: "bold",
        decoration: "none"
    },
    blurb: {
        maxWidth: 600,
        textAlign: "center"
    },
    margin: {
        margin: theme.spacing(1),
    },
    disabledButton: {
        margin: theme.spacing(1),
        backgroundColor: 'grey'
    },
    uniImage: {
        marginLeft: 10
    }
}))


enum StakeButtonState {
    Unset,
    RequirementSet,
    NotApproved,
    Approving,
    Approved,
    BalanceTooLow,
    BalanceHighEnough,
    Staked
}
export default function StakingScreen() {
    const classes = useStakeStyles()
    const walletContextProps = useContext(WalletContext)
    const [scxEyeRequired, setScxEyeRequired] = useState<string>('')
    const [eyeEthRequired, setEyeEthRequired] = useState<string>('')
    // const [scxEyeBalance, setScxEyeBalance] = useState<string>('0')
    // const [eyeEthBalance, setEyeEthBalance] = useState<string>('0')
    const [scxEyeButtonState, setScxEyeButtonState] = useState<StakeButtonState>(StakeButtonState.Unset)
    const [eyeEthButtonState, setEyeEthButtonState] = useState<StakeButtonState>(StakeButtonState.Unset)
    const [eyeSCXEffect, setEyeSCXEffect] = useState<Token | null>()
    const [eyeETHEffect, setEyeETHEffect] = useState<Token | null>()
    const [eyeSCXApproveClicked, setEyeSCXApproveClicked] = useState<boolean>(false)
    const [eyeEthApproveClicked, setEyeEthApproveClicked] = useState<boolean>(false)
    const [stakeSCXClicked, setStakeSCXClicked] = useState<boolean>(false)
    const [stakeEYEClicked, setStakeEYEClicked] = useState<boolean>(false)

    const pairEffectCallback = useCallback(async () => {

        setEyeSCXEffect(await API.EYE_SCXEffects(walletContextProps.networkName, walletContextProps.account))
        setEyeETHEffect(await API.EYE_ETHEffects(walletContextProps.networkName, walletContextProps.account))

    }, [])

    useEffect(() => { pairEffectCallback() }, [])

    //Figure out how much of each LP required
    useEffect(() => {
        if (eyeEthButtonState === StakeButtonState.Unset) {
            const eyeEffect = API.eyeWethLPEffects.impliedProportionLPUnitsAbsoluteToken1('1000')
            const subscription = eyeEffect.Observable.subscribe(ethEye => {
                setEyeEthRequired(formatSignificantDecimalPlaces(ethEye, 2))
                setEyeEthButtonState(StakeButtonState.RequirementSet)
            })
            return () => { eyeEffect.cleanup(); subscription.unsubscribe() }
        }

        if (scxEyeButtonState === StakeButtonState.Unset) {
            const scxEffect = API.scxEyeLPEffects.impliedProportionLPUnitsPercentage("10")
            const subscription = scxEffect.Observable.subscribe(scxEYE => {
                setScxEyeRequired(formatSignificantDecimalPlaces(scxEYE, 2))
                setScxEyeButtonState(StakeButtonState.RequirementSet)
            })

            return () => { scxEffect.cleanup(); subscription.unsubscribe() }
        }
        return () => { }
    }, [walletContextProps.account, scxEyeButtonState, eyeEthButtonState])

    //Establish whether balance high enough
    useEffect(() => {
        if (scxEyeButtonState === StakeButtonState.Approved && eyeSCXEffect) {
            const effect = eyeSCXEffect.balanceOfTokenEffect(walletContextProps.account)
            const subscription = effect.Observable.subscribe(balance => {
                setScxEyeButtonState(balance === '0' ? StakeButtonState.BalanceTooLow : StakeButtonState.BalanceHighEnough)

            })
            return () => {
                effect.cleanup(); subscription.unsubscribe();
            }
        }

        if (eyeEthButtonState === StakeButtonState.Approved && eyeETHEffect) {
            const effect = eyeETHEffect.balanceOfEffect(walletContextProps.account)
            const subscription = effect.Observable.subscribe(balance => {
                const balWei = new BigNumber(balance)
                const reqWei = new BigNumber(eyeEthRequired)
                setEyeEthButtonState(balWei.lt(reqWei) ? StakeButtonState.BalanceTooLow : StakeButtonState.BalanceHighEnough)
                // setEyeEthBalance(formatSignificantDecimalPlaces(balance, 2))

            })
            return () => {
                effect.cleanup(); subscription.unsubscribe();
            }
        }
        return () => { }
    }, [scxEyeButtonState, eyeEthButtonState, eyeSCXEffect, eyeETHEffect])



    const eyeSCXApproveClickedCallback = useCallback(async () => {
        if (eyeSCXApproveClicked) {
            const pairAddress = await API.EYE_SCX_PAIR(walletContextProps.networkName, walletContextProps.account)
            const token = await API.getToken(pairAddress, walletContextProps.networkName)
            const Sluice = walletContextProps.contracts.behodler.Behodler2.LiquidQueue.SluiceGate.address
            token.approve(Sluice, API.UINTMAX).send({ from: walletContextProps.account }, () => {

            }).on('receipt', function () {
                setScxEyeButtonState(StakeButtonState.Approving)
            })
            setEyeSCXApproveClicked(false)
        }
    }, [eyeSCXApproveClicked])


    useEffect(() => {
        eyeSCXApproveClickedCallback()
    }, [eyeSCXApproveClicked])

    const eyeETHApproveClickedCallback = useCallback(async () => {
        if (eyeEthApproveClicked) {
            const pairAddress = await API.EYE_ETH_PAIR(walletContextProps.networkName, walletContextProps.account)
            const token = await API.getToken(pairAddress, walletContextProps.networkName)
            const Sluice = walletContextProps.contracts.behodler.Behodler2.LiquidQueue.SluiceGate.address
            token.approve(Sluice, API.UINTMAX).send({ from: walletContextProps.account }, () => {
                setEyeEthButtonState(StakeButtonState.Approving)
            }).on('receipt', function () {
                setEyeEthButtonState(StakeButtonState.Approving)
            })
            setEyeEthApproveClicked(false)
        }
    }, [eyeEthApproveClicked])


    useEffect(() => {
        eyeETHApproveClickedCallback()
    }, [eyeEthApproveClicked])

    const allowanceCheck = useCallback(async () => {
        const Sluice = walletContextProps.contracts.behodler.Behodler2.LiquidQueue.SluiceGate.address
        if (scxEyeButtonState === StakeButtonState.RequirementSet || scxEyeButtonState === StakeButtonState.Approving || scxEyeButtonState === StakeButtonState.NotApproved) {
            const EYE_SCX = await API.EYE_SCX_PAIR(walletContextProps.networkName, walletContextProps.account)
            const allowance = await API.getTokenAllowance(EYE_SCX, walletContextProps.account, false, 18, Sluice)
            if (new BigNumber(API.toWei(scxEyeRequired)).lte(new BigNumber(allowance.toString()))) {
                setScxEyeButtonState(StakeButtonState.Approved)
            }
        }

        if (eyeEthButtonState === StakeButtonState.RequirementSet || eyeEthButtonState === StakeButtonState.Approving || eyeEthButtonState === StakeButtonState.NotApproved) {
            const EYE_ETH = await API.EYE_ETH_PAIR(walletContextProps.networkName, walletContextProps.account)
            const allowance = await API.getTokenAllowance(EYE_ETH, walletContextProps.account, false, 18, Sluice)
            if (new BigNumber(API.toWei(eyeEthRequired)).lte(new BigNumber(allowance.toString()))) {
                setEyeEthButtonState(StakeButtonState.Approved)
            }
        }

    }, [scxEyeButtonState, eyeEthButtonState])

    useEffect(() => {
        allowanceCheck()
    }, [scxEyeButtonState, eyeEthButtonState])

    const scxClickedCallback = useCallback(async () => {
        if (stakeSCXClicked) {
            const EYE_SCX = await API.EYE_SCX_PAIR(walletContextProps.networkName, walletContextProps.account)
            walletContextProps.contracts.behodler.Behodler2.LiquidQueue.SluiceGate
                .betaApply(EYE_SCX)
                .send({ from: walletContextProps.account })
                .on('receipt', function () {
                    console.log('preparing queue')
                })
            setStakeSCXClicked(false)
        }
    }, [stakeSCXClicked])

    useEffect(() => { scxClickedCallback() }, [stakeSCXClicked])

    const eyeClickedCallback = useCallback(async () => {
        if (stakeEYEClicked) {
            const EYE_ETH = await API.EYE_ETH_PAIR(walletContextProps.networkName, walletContextProps.account)
            walletContextProps.contracts.behodler.Behodler2.LiquidQueue.SluiceGate
                .betaApply(EYE_ETH)
                .send({ from: walletContextProps.account })
                .on('receipt', function () {
                    console.log('preparing queue')
                })
                setStakeEYEClicked(false)
        }
    }, [stakeEYEClicked])

    useEffect(() => { eyeClickedCallback() }, [stakeSCXClicked])

    let stakeScxEyeText = scxEyeButtonState >= StakeButtonState.Approved ? `Stake ${scxEyeRequired} SCX/EYE` : `Approve SCX/EYE`
    let stakeEyeEthText = eyeEthButtonState >= StakeButtonState.Approved ? `Stake ${eyeEthRequired} EYE/ETH` : `Approve EYE/ETH`
    const scxEyeVisible = scxEyeButtonState >= StakeButtonState.RequirementSet
    const eyeEthVisible = eyeEthButtonState >= StakeButtonState.RequirementSet

    const eyeSCXAction = scxEyeButtonState < StakeButtonState.Approving ? () => setEyeSCXApproveClicked(true) : () => setStakeSCXClicked(true)
    const eyeEthAction = eyeEthButtonState < StakeButtonState.Approving ? () => setEyeEthApproveClicked(true) : () => setStakeEYEClicked(true)


    return <div>
        <Grid container
            direction="column"
            justify="space-between"
            alignItems="center"
            spacing={10}
        >
            <Grid item className={classes.blurb}>
                In order to participate in the Beta round, you are required to stake Uniswap V2 liquidity pool tokens from either the <PoolLink link='https://info.uniswap.org/pair/0x54965801946d768b395864019903aef8b5b63bb3'>EYE/ETH</PoolLink> pool or the <PoolLink link="https://info.uniswap.org/pair/0xf047ee812b21050186f86106f6cabdfec35366c6">EYE/SCX</PoolLink> pool.
                The staked value is held in a custodial smart contract and is not utilized in the Liquid Queue. You may unstake them at any time, however the Liquid Queue will only be
                available as long as they remain staked.
            </Grid>
            <Grid item>
                <Grid
                    container
                    direction="row"
                    justify="space-between"
                    alignItems="center"
                    spacing={10}
                >
                    <Grid item>
                        {eyeEthVisible ? <StakeButton disabled={eyeEthButtonState === StakeButtonState.BalanceTooLow} action={eyeEthAction}>{stakeEyeEthText}</StakeButton> : ""}
                    </Grid>
                    <Grid item>
                        {scxEyeVisible ? <StakeButton disabled={scxEyeButtonState === StakeButtonState.BalanceTooLow} action={eyeSCXAction}>{stakeScxEyeText}</StakeButton> : ''}
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    </div >
}

function PoolLink(props: { link: string, children: string }) {
    const classes = useStakeStyles()
    return <Link className={classes.poolLink} href={props.link} target="_blank">{props.children}</Link>
}


const ColorButton = withStyles((theme: Theme) => ({
    root: {
        color: theme.palette.getContrastText(purple[500]),
        fontWeight: "bold",
        backgroundColor: purple[300],
        '&:hover': {
            backgroundColor: purple[700],
            color: lightGreen[100]
        },
    },
}))(Button);

const DisabledColorButton = withStyles((theme: Theme) => ({
    root: {
        color: theme.palette.getContrastText(purple[500]),
        fontWeight: "bold",
        backgroundColor: 'grey',
        '&:hover': {
            backgroundColor: 'grey',
            color: lightGreen[100]
        },
    },
}))(Button);

function UniImage(props: { grey?: boolean }) {
    const classes = useStakeStyles()
    return <img className={classes.uniImage} width={30} src={props.grey ? unigrey : uniswap} />
}

function StakeButton(props: { children: any, action: () => void, disabled?: boolean }) {
    const classes = useStakeStyles()

    return props.disabled ? <DisabledColorButton title="Insufficient Uniswap LP token balance" variant="contained" className={classes.margin}>
        {props.children} <UniImage grey />
    </DisabledColorButton>
        : <ColorButton variant="contained" className={classes.margin} onClick={() => props.action()}>
            {props.children} <UniImage />
        </ColorButton>
}

